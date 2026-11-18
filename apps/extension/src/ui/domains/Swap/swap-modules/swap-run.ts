import { log } from "@common/log"
import { getBittensorEvmReservedWei } from "@core/domains/bittensor/constants"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { parseTokenId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
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
  SwapTransactionContext,
} from "./common.swap-module"
import { type AllowanceStep, readAllowanceStep } from "./erc20-approval"

export type RunLeg =
  | { at: "queued" }
  | { at: "ready" }
  | { at: "sent"; hash: Hex; input: bigint }
  | { at: "landed"; hash: Hex; amount: bigint }
  | { at: "stopped"; hash: Hex; stop: LegStop }

export type SwapRun = {
  id: string
  quote: BaseQuote
  slippage: number
  legs: NonEmpty<RunLeg>
}

type RunModule = Pick<SwapModule, "protocol" | "settleLeg">

const moduleOf = <M extends RunModule>(modules: readonly M[], leg: QuoteLeg) =>
  modules.find((module) => module.protocol === leg.protocol)

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

export const legSent = (run: SwapRun, index: number, hash: Hex, input: bigint): SwapRun =>
  run.legs[index]?.at === "ready" ? withLegs(run, { [index]: { at: "sent", hash, input } }) : run

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

export const settlingLeg = (run: SwapRun): number | null => {
  const index = run.legs.findIndex((leg) => leg.at === "sent")
  return index >= 0 && index < run.legs.length - 1 ? index : null
}

export const readyLeg = (run: SwapRun): number | null => {
  const index = run.legs.findIndex((leg) => leg.at === "ready")
  return index >= 0 ? index : null
}

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

export type LegChain =
  | { platform: "ethereum"; client: PublicClient }
  | {
      platform: "polkadot"
      sapi: ScaleApi
      feeOnTop?: (payload: SignerPayloadJSON) => Promise<bigint>
    }

const readEvmBalance = async (client: PublicClient, leg: QuoteLeg): Promise<bigint> => {
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

type SystemAccount = { data?: { free?: bigint; reserved?: bigint; frozen?: bigint } }

const readSubstrateBalance = async (sapi: ScaleApi, leg: QuoteLeg): Promise<bigint> => {
  if (parseTokenId(leg.fromTokenId).type !== "substrate-native")
    throw new Error("Only a native token funds a substrate leg")
  const account = await sapi.getStorage<SystemAccount | null>("System", "Account", [leg.signer])
  const { free = 0n, reserved = 0n, frozen = 0n } = account?.data ?? {}
  const existentialDeposit = sapi.getConstant<bigint>("Balances", "ExistentialDeposit")
  const locked = frozen > reserved ? frozen - reserved : 0n
  return free - (locked > existentialDeposit ? locked : existentialDeposit)
}

export const readLegBalance = (chain: LegChain, leg: QuoteLeg): Promise<bigint> =>
  chain.platform === "ethereum"
    ? readEvmBalance(chain.client, leg)
    : readSubstrateBalance(chain.sapi, leg)

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
  | {
      signs: "leg"
      input: bigint
      built: BuiltLeg
      fee?: bigint
    }

export type NextLegStepParams = {
  run: SwapRun
  index: number
  module: SwapModule
  chain: LegChain
  /** the block an approval the screen saw mine is in: a node behind it still reports the old allowance */
  allowanceAt?: bigint
}

type SubstrateChain = Extract<LegChain, { platform: "polkadot" }>

const substrateFee = async ({ sapi, feeOnTop }: SubstrateChain, { transaction }: BuiltLeg) => {
  if (transaction.platform !== "polkadot")
    throw new Error("Only a substrate transaction is signed on a substrate leg")
  const [fee, onTop] = await Promise.all([
    sapi.getFeeEstimate(transaction.payload),
    feeOnTop?.(transaction.payload) ?? 0n,
  ])
  return fee + onTop
}

const nextSubstrateLegStep = async (
  chain: SubstrateChain,
  leg: QuoteLeg,
  landed: bigint,
  build: (input: bigint) => Promise<BuiltLeg>
): Promise<LegStep> => {
  const spendable = await readLegBalance(chain, leg)
  const input = legInput(landed, leg.inputAmount, spendable)
  const built = await build(input)
  const fee = await substrateFee(chain, built)
  if (input + fee <= spendable) return { signs: "leg", input, built, fee }

  const fitted = legInput(landed, leg.inputAmount, spendable - fee)
  const refitted = await build(fitted)
  return { signs: "leg", input: fitted, built: refitted, fee: await substrateFee(chain, refitted) }
}

export const nextLegStep = async ({
  run,
  index,
  module,
  chain,
  allowanceAt,
}: NextLegStepParams): Promise<LegStep> => {
  const previous = run.legs[index - 1]
  if (run.legs[index]?.at !== "ready" || previous?.at !== "landed")
    throw new Error("This leg is not ready to sign")

  const leg = run.quote.legs[index]
  const build = (input: bigint, context: SwapTransactionContext) =>
    module.buildLeg({ leg, input, context, exchange: null, slippage: run.slippage })

  if (chain.platform === "polkadot") {
    const context: SwapTransactionContext = { platform: "polkadot", sapi: chain.sapi }
    return nextSubstrateLegStep(chain, leg, previous.amount, (input) => build(input, context))
  }

  const approval = legApproval(module, leg)
  const [spendable, allowance] = await Promise.all([
    readLegBalance(chain, leg),
    approval ? readAllowanceStep(chain.client, approval, allowanceAt) : ("none" as const),
  ])
  if (approval && allowance !== "none") return { signs: "approval", approval, allowance }

  const input = legInput(previous.amount, leg.inputAmount, spendable)
  return { signs: "leg", input, built: await build(input, { platform: "ethereum" }) }
}
