import {
  BITTENSOR_EVM_PAIRS,
  BITTENSOR_EXISTENTIAL_DEPOSIT_RAO,
  BITTENSOR_WEI_PER_RAO,
} from "@core/domains/bittensor/constants"
import { type NetworkId, networkIdFromTokenId } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"
import type { Hex } from "viem"

import type { QuoteLeg } from "../types"
import type { LegState, PersistedQuoteLeg, SwapPlan } from "./types"

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

/** Bittensor EVM reaps an account that drops under the existential deposit */
const keepAliveWei = (networkId: NetworkId) =>
  BITTENSOR_EVM_PAIRS.some((pair) => pair.evmNetworkId === networkId)
    ? BITTENSOR_EXISTENTIAL_DEPOSIT_RAO * BITTENSOR_WEI_PER_RAO
    : 0n

/**
 * What leg `index` spends: the least of what the previous leg landed, what the signer can spend
 * and what was quoted. Funds already on the intermediate are never swept into the plan.
 */
export const deriveLegInput = (plan: SwapPlan, index: number, balance: bigint): bigint => {
  const leg = plan.legs[index]
  const previous = plan.legs[index - 1]
  const landed = previous?.state.at === "landed" ? BigInt(previous.state.amount) : 0n
  const spendable = balance - keepAliveWei(networkIdFromTokenId(leg.quote.fromTokenId))
  return [landed, BigInt(leg.quote.inputAmount), spendable].reduce((min, value) =>
    value < min ? value : min
  )
}

/** the stepper's statuses, named here so the pages can map a plan without a core-to-ui import */
export type PlanStepStatus =
  | "upcoming"
  | "waiting-on-you"
  | "in-progress"
  | "done"
  | "failed"
  | "skipped"

export type PlanStep = {
  leg: number
  status: PlanStepStatus
  hash: Hex | null
}

const STEP_STATUS: Record<LegState["at"], PlanStepStatus> = {
  "queued": "upcoming",
  "awaiting-user": "waiting-on-you",
  "building": "in-progress",
  "sent": "in-progress",
  "landed": "done",
  "failed": "failed",
  "skipped": "skipped",
}

const hashOf = (state: LegState): Hex | null => ("hash" in state ? (state.hash ?? null) : null)

export const planSteps = (plan: SwapPlan): PlanStep[] =>
  plan.legs.map((leg, index) => ({
    leg: index,
    status: STEP_STATUS[leg.state.at],
    hash: hashOf(leg.state),
  }))
