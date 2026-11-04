import { log } from "@common/log"
import { getBittensorEvmReservedWei } from "@core/domains/bittensor/constants"
import { parseTokenId } from "@talismn/chaindata-provider"
import { erc20Abi, type Hex, type PublicClient } from "viem"
import type {
  ApprovalInfo,
  BaseQuote,
  BuiltLeg,
  LegOutcome,
  LegStop,
  NonEmpty,
  QuoteLeg,
  SwapModule,
} from "./common.swap-module"
import { type AllowanceStep, readAllowanceStep } from "./erc20-approval"

export type RunLeg =
  | { at: "queued" }
  /** the previous leg landed: the user signs this one next */
  | { at: "ready" }
  | { at: "sent"; hash: Hex; input: bigint }
  /** amount: what reached the next leg's signer */
  | { at: "landed"; hash: Hex; amount: bigint }
  | { at: "stopped"; hash: Hex; stop: LegStop }

/**
 * A multi-leg swap while the screen that started it stays open. The user signs each leg once the
 * previous one landed. The last leg is never settled here: its card follows its own transaction.
 */
export type SwapRun = {
  id: string
  quote: BaseQuote
  /** decimal, 0.005 is 0.5% */
  slippage: number
  legs: NonEmpty<RunLeg>
}

type RunModule = Pick<SwapModule, "protocol" | "settleLeg">

const moduleOf = <M extends RunModule>(modules: readonly M[], leg: QuoteLeg) =>
  modules.find((module) => module.protocol === leg.protocol)

/** every leg before the last can tell what it delivered, so the run reaches the last one */
export const canRun = (quote: BaseQuote, modules: readonly RunModule[]): boolean =>
  quote.legs.slice(0, -1).every((leg) => !!moduleOf(modules, leg)?.settleLeg)

export const startRun = (
  quote: BaseQuote,
  slippage: number,
  first: { hash: Hex; input: bigint }
): SwapRun => ({
  id: crypto.randomUUID(),
  quote,
  slippage,
  legs: [{ at: "sent", ...first }, ...quote.legs.slice(1).map((): RunLeg => ({ at: "queued" }))],
})

const withLegs = (run: SwapRun, changes: Record<number, RunLeg>): SwapRun => ({
  ...run,
  legs: run.legs.map((leg, index) => changes[index] ?? leg) as NonEmpty<RunLeg>,
})

/** a leg that is not ready returns the run unchanged */
export const legSent = (run: SwapRun, index: number, hash: Hex, input: bigint): SwapRun =>
  run.legs[index]?.at === "ready" ? withLegs(run, { [index]: { at: "sent", hash, input } }) : run

/** a leg that is not sent returns the run unchanged, so a late or repeated settle changes nothing */
export const legSettled = (run: SwapRun, index: number, outcome: LegOutcome): SwapRun => {
  if (run.legs[index]?.at !== "sent") return run
  if (!outcome.landed)
    return withLegs(run, { [index]: { at: "stopped", hash: outcome.hash, stop: outcome.stop } })

  const landed: RunLeg = { at: "landed", hash: outcome.hash, amount: outcome.amount }
  return withLegs(
    run,
    index + 1 < run.legs.length
      ? { [index]: landed, [index + 1]: { at: "ready" } }
      : { [index]: landed }
  )
}

/** the sent leg the run waits on, never the last: that one follows its own transaction */
export const settlingLeg = (run: SwapRun): number | null => {
  const index = run.legs.findIndex((leg) => leg.at === "sent")
  return index >= 0 && index < run.legs.length - 1 ? index : null
}

/** a settle that cannot tell leaves the leg untracked, the user checks the balance the funds went to */
export const settleRunLeg = async (
  run: SwapRun,
  index: number,
  modules: readonly RunModule[],
  signal: AbortSignal
): Promise<LegOutcome> => {
  const sent = run.legs[index]
  if (sent?.at !== "sent") throw new Error("This leg was not sent")
  const leg = run.quote.legs[index]
  try {
    const settleLeg = moduleOf(modules, leg)?.settleLeg
    if (!settleLeg) throw new Error(`${leg.protocol} cannot settle a leg`)
    return await settleLeg({ leg, hash: sent.hash, input: sent.input }, signal)
  } catch (cause) {
    if (signal.aborted) throw cause
    log.warn("Could not settle the swap leg", { cause, protocol: leg.protocol })
    return { landed: false, hash: sent.hash, stop: "untracked" }
  }
}

export const legApproval = (module: SwapModule, leg: QuoteLeg): ApprovalInfo => {
  if (!leg.signer) return null
  return (
    module.getApprovalInfo?.({
      fromTokenId: leg.fromTokenId,
      toTokenId: leg.toTokenId,
      fromAmount: leg.inputAmount,
      fromAddress: leg.signer,
      toAddress: leg.recipient,
      quoteData: { legs: [leg] },
    }) ?? null
  )
}

/** what the signer can spend of the leg's token: Bittensor EVM keeps its existential deposit back */
export const readLegBalance = async (client: PublicClient, leg: QuoteLeg): Promise<bigint> => {
  const specs = parseTokenId(leg.fromTokenId)
  const address = leg.signer as Hex
  const balance =
    specs.type === "evm-erc20"
      ? await client.readContract({
          address: specs.contractAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        })
      : await client.getBalance({ address })
  return balance - getBittensorEvmReservedWei(leg.fromTokenId)
}

/**
 * Never more than the previous leg landed, so funds already on the account stay out of the swap,
 * nor more than the quote the user confirmed, nor more than the signer holds.
 */
export const legInput = (landed: bigint, quoted: bigint, spendable: bigint): bigint => {
  const input = [landed, quoted, spendable].reduce((min, value) => (value < min ? value : min))
  if (input <= 0n) throw new Error("Nothing arrived from the previous leg")
  return input
}

export type LegStep =
  | {
      signs: "approval"
      approval: NonNullable<ApprovalInfo>
      allowance: Exclude<AllowanceStep, "none">
    }
  | { signs: "leg"; input: bigint; built: BuiltLeg }

export type NextLegStepParams = {
  run: SwapRun
  index: number
  module: SwapModule
  /** a client of the network the leg spends on */
  client: PublicClient
  /** the block an approval the screen saw mine is in: a node behind it still reports the old allowance */
  allowanceAt?: bigint
}

/** what the user signs next for a ready leg: the allowance its spender still needs, else the leg itself */
export const nextLegStep = async ({
  run,
  index,
  module,
  client,
  allowanceAt,
}: NextLegStepParams): Promise<LegStep> => {
  const previous = run.legs[index - 1]
  if (run.legs[index]?.at !== "ready" || previous?.at !== "landed")
    throw new Error("This leg is not ready to sign")

  const leg = run.quote.legs[index]
  const approval = legApproval(module, leg)
  const [spendable, allowance] = await Promise.all([
    readLegBalance(client, leg),
    approval ? readAllowanceStep(client, approval, allowanceAt) : ("none" as const),
  ])
  if (approval && allowance !== "none") return { signs: "approval", approval, allowance }

  const input = legInput(previous.amount, leg.inputAmount, spendable)
  const built = await module.buildLeg({
    leg,
    input,
    context: { platform: "ethereum" },
    exchange: null,
    slippage: run.slippage,
  })
  return { signs: "leg", input, built }
}
