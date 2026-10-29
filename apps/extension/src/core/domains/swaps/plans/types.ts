import type { TokenId } from "@talismn/chaindata-provider"
import type { AccountType } from "@talismn/keyring"
import type { Hex } from "viem"

import type {
  LegBound,
  LegObservation,
  LegReplacement,
  NonEmpty,
  SentEvidence,
  SupportedSwapProtocol,
} from "../types"

export type SwapPlanId = string & { readonly __brand: "SwapPlanId" }

/** carried on `txInfo.plan` by every transaction row that belongs to a plan */
export type SwapPlanRef = { id: SwapPlanId; leg: number }

/** derived from the legs on every write, stored so Dexie can index it */
export type PlanPhase = "proposed" | "running" | "paused" | "completed" | "stopped" | "aborted"

export type LegFailure =
  | "dropped"
  | "reverted"
  | "replaced"
  | "indeterminate"
  | "out-of-bounds"
  | "provider-unavailable"
  | "build-failed"
  | "expired"
  | "cancelled"

export type AwaitingUserReason = "unlock" | "hardware"

export type LegState =
  | { at: "queued" }
  | { at: "awaiting-user"; why: AwaitingUserReason; since: number }
  | { at: "building"; attempt: number; nextAttemptAt: number }
  | {
      at: "sent"
      /** the leg's own transaction. The user's speed-ups and cancels of it are in its evidence */
      hash: Hex
      sentAt: number
      /** past it, a leg still pending is indeterminate */
      deadlineAt: number
      evidence: SentEvidence
    }
  /** hash: the transaction that executed, a speed-up's when one replaced the leg's own */
  | { at: "landed"; hash: Hex; amount: string; landedAt: number }
  | { at: "failed"; failure: LegFailure; hash?: Hex; failedAt: number }
  | { at: "skipped" }

export type PersistedQuoteFee = {
  name: string
  amount: string
  tokenId: TokenId
  additional?: boolean
  gas?: boolean
}

/** a QuoteLeg at rest: planck strings, signer and recipient known */
export type PersistedQuoteLeg = {
  protocol: SupportedSwapProtocol
  fromTokenId: TokenId
  toTokenId: TokenId
  signer: string
  recipient: string
  inputAmount: string
  outputAmount: string
  fees: PersistedQuoteFee[]
  timeInSec: number
  data?: unknown
}

export type PlanLeg = {
  quote: PersistedQuoteLeg
  signerType: AccountType
  /** null on leg 0, the user signs it on screen. Null on a later leg: it always needs the user */
  bound: LegBound | null
  /** set once, at the leg's first admission (leg 0: at the propose). Every rebuild signs with it */
  nonce?: number
  state: LegState
}

export type PlanSummary = {
  fromTokenId: TokenId
  toTokenId: TokenId
  fromAmount: string
  quotedOutput: string
  recipient: string
  protocol: SupportedSwapProtocol
  subProtocol?: string
  provider?: { name: string; logo: string }
  /** decimal, 0.005 is 0.5% */
  slippage: number
}

export type SwapPlan = {
  id: SwapPlanId
  phase: PlanPhase
  createdAt: number
  updatedAt: number
  /** leg 0 admitted plus the signing window; null while proposed */
  signUntil: number | null
  summary: PlanSummary
  /** the EVM address that holds the funds between legs */
  intermediate: string
  legs: NonEmpty<PlanLeg>
  /** what the plan last waited on the user for: a leg's own state forgets it once the leg moves on */
  pausedFor?: AwaitingUserReason
}

export type PlanEvent =
  | {
      type: "admitted"
      leg: number
      hash: Hex
      nonce: number
      deadlineAt: number
      evidence: SentEvidence
    }
  | {
      type: "replacement-admitted"
      leg: number
      replacement: LegReplacement
      /** the replacement's own deadline: the leg is not called indeterminate before it */
      deadlineAt: number
    }
  | {
      type: "observed"
      leg: number
      observation: LegObservation
      /** how many of the leg's transactions the observation looked for */
      candidates: number
    }
  | { type: "deadline"; leg: number }
  | {
      type: "build-failed"
      leg: number
      failure: "transient" | "out-of-bounds" | "provider-unavailable"
    }
  | { type: "locked"; leg: number }
  | { type: "unlocked" }
  | { type: "cancelled" }
  | { type: "expired" }

export type PlanEffect =
  | { type: "build-and-sign"; leg: number }
  | { type: "observe"; leg: number }
  | { type: "notify"; kind: "needs-you" | "stopped" | "completed" }
