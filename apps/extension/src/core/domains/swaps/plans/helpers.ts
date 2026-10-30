import { getBittensorEvmReservedWei } from "@core/domains/bittensor/constants"
import { parseTokenId } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"
import { erc20Abi, type Hex, type PublicClient } from "viem"

import { latestCandidate } from "../candidates"
import type { QuoteLeg } from "../types"
import type { LegState, PersistedQuoteLeg, PlanLeg, SwapPlan } from "./types"

export const toPersistedLeg = (leg: QuoteLeg): PersistedQuoteLeg => {
  if (!leg.signer || !leg.recipient)
    throw new Error("A swap plan leg needs a signer and a recipient")
  return {
    ...leg,
    signer: leg.signer,
    recipient: leg.recipient,
    inputAmount: leg.inputAmount.toString(),
    outputAmount: leg.outputAmount.toString(),
    fees: leg.fees.map((fee) => ({ ...fee, amount: fee.amount.toFixed() })),
  }
}

export const fromPersistedLeg = (leg: PersistedQuoteLeg): QuoteLeg => ({
  ...leg,
  inputAmount: BigInt(leg.inputAmount),
  outputAmount: BigInt(leg.outputAmount),
  fees: leg.fees.map((fee) => ({ ...fee, amount: BigNumber(fee.amount) })),
})

/** what the leg's signer can spend of the token the leg spends: its balance less what the chain reserves */
export const readLegBalance = async (
  client: PublicClient,
  leg: Pick<PersistedQuoteLeg, "fromTokenId" | "signer">
): Promise<bigint> => {
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
 * What leg `index` spends: the least of what the previous leg landed, what was quoted and what
 * the signer can spend. Funds already on the intermediate are never swept into the plan.
 */
export const deriveLegInput = (plan: SwapPlan, index: number, spendable: bigint): bigint => {
  const leg = plan.legs[index]
  const previous = plan.legs[index - 1]
  const landed = previous?.state.at === "landed" ? BigInt(previous.state.amount) : 0n
  return [landed, BigInt(leg.quote.inputAmount), spendable].reduce((min, value) =>
    value < min ? value : min
  )
}

type PlanStep = {
  leg: number
  hash: Hex | null
}

/** a sent leg is followed by its latest transaction, a landed one by the one that executed */
const hashOf = (state: LegState): Hex | null => {
  if (state.at === "sent") return latestCandidate(state).hash
  return "hash" in state ? (state.hash ?? null) : null
}

export const planSteps = (plan: SwapPlan): PlanStep[] =>
  plan.legs.map((leg, index) => ({
    leg: index,
    hash: hashOf(leg.state),
  }))

type RecoveryOffer = {
  fromTokenId: PersistedQuoteLeg["fromTokenId"]
  toTokenId: PersistedQuoteLeg["toTokenId"]
  fromAddress: string
}

const stoppingLeg = (plan: SwapPlan): PlanLeg | undefined =>
  plan.phase === "stopped" ? plan.legs.find((leg) => leg.state.at === "failed") : undefined

/** Only when the stopping leg sent nothing, or the user's cancel executed instead: the funds then provably wait on its signer */
const recoveryOffer = (plan: SwapPlan): RecoveryOffer | null => {
  const leg = stoppingLeg(plan)
  if (leg?.state.at !== "failed") return null
  if (leg.state.hash && leg.state.failure !== "cancelled") return null
  return {
    fromTokenId: leg.quote.fromTokenId,
    toTokenId: leg.quote.toTokenId,
    fromAddress: leg.quote.signer,
  }
}

export type PlanCallToAction =
  | { type: "unlock" }
  | { type: "sign-hardware"; leg: number }
  | { type: "finish"; offer: RecoveryOffer }
  | { type: "check-activity" }

export const planCallToAction = (plan: SwapPlan): PlanCallToAction => {
  const waiting = plan.legs.findIndex((leg) => leg.state.at === "awaiting-user")
  const waitingState = plan.legs[waiting]?.state
  if (waitingState?.at === "awaiting-user")
    return waitingState.why === "unlock"
      ? { type: "unlock" }
      : { type: "sign-hardware", leg: waiting }

  const offer = recoveryOffer(plan)
  if (offer) return { type: "finish", offer }
  return { type: "check-activity" }
}
