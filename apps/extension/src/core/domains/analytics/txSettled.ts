import {
  SWAP_OUTCOMES,
  type SwapOutcome,
  type SwapPlanStopReason,
  swapOfTransaction,
} from "@common/analytics/funds"
import { toSettleMs } from "@common/analytics/schema"
import { type SettledStatus, txTypeOf } from "@common/analytics/transactions"
import { networkIdFromTokenId } from "@talismn/chaindata-provider"

import { db } from "../../db"
import type { SwapPlanSettledFact } from "../swaps/plans/store"
import type { LegFailure } from "../swaps/plans/types"
import type { TxStatusFact, TxStatusReason } from "../transactions/store.transactions"
import type { SwapStatus, TransactionStatus } from "../transactions/types"
import type { SwapOutcomeFact } from "../transactions/watchSwapStatus"
import { flowTracker } from "./flowTracker"
import { track } from "./track"
import { analyticsNetworkId, signerOfAddress } from "./txContext"

const isFinal = (status: TransactionStatus) =>
  status === "success" || status === "error" || status === "replaced"

export const settledStatusOf = (
  from: TransactionStatus,
  to: TransactionStatus,
  reason: TxStatusReason
): SettledStatus | null => {
  if (isFinal(from) || !isFinal(to)) return null
  if (reason === "dropped") return "dropped"
  if (reason === "restart") return "replaced"
  return to as SettledStatus
}

/** a swap plan's legs settle its flow together, through trackSwapPlanSettled */
export const trackTxSettled = async ({ row, from, to, reason, at }: TxStatusFact) => {
  if (row.txInfo?.plan) return
  const status = settledStatusOf(from, to, reason)
  if (!status) return

  const [networkId, signer] = await Promise.all([
    analyticsNetworkId({ networkId: row.networkId }),
    signerOfAddress(row.account),
  ])
  const timeToSettleMs = toSettleMs(at - row.timestamp)
  track("tx_settled", {
    status,
    platform: row.platform,
    network_id: networkId,
    tx_type: txTypeOf(row.txInfo),
    time_to_settle_ms: timeToSettleMs,
    submitted_by: row.siteUrl ? "dapp" : "wallet",
    ...(signer && { signer }),
  })
  const swap = swapOfTransaction(row.txInfo)
  if (swap && status === "success") return
  await flowTracker.settled(
    row.id,
    { status, timeToSettleMs, ...(swap && { properties: swap }) },
    Date.now()
  )
}

const isSwapOutcome = (status: SwapStatus): status is SwapOutcome =>
  (SWAP_OUTCOMES as readonly string[]).includes(status)

export const trackSwapOutcome = async ({ row, status, at }: SwapOutcomeFact) => {
  if (row.txInfo?.plan) return
  const swap = swapOfTransaction(row.txInfo)
  if (!swap || !isSwapOutcome(status)) return
  await flowTracker.settled(
    row.id,
    {
      status: "success",
      timeToSettleMs: toSettleMs(at - row.timestamp),
      properties: { ...swap, swap_status: status },
    },
    Date.now()
  )
}

const STOP_REASON: Record<LegFailure, SwapPlanStopReason> = {
  "dropped": "dropped",
  "reverted": "reverted",
  "replaced": "replaced",
  "indeterminate": "indeterminate",
  "out-of-bounds": "out_of_bounds",
  "provider-unavailable": "provider_unavailable",
  "build-failed": "build_failed",
  "expired": "expired",
  "cancelled": "cancelled",
}

const planStatusOf = (failure: LegFailure | undefined): SettledStatus => {
  if (!failure) return "success"
  if (failure === "dropped" || failure === "replaced") return failure
  return "error"
}

/**
 * Settles the swap flow of a plan, linked through its first leg's own transaction even when a
 * speed-up or cancel of it executed. A plan whose first leg was never signed has no flow to settle.
 */
export const trackSwapPlanSettled = async ({ plan, at }: SwapPlanSettledFact) => {
  const first = plan.legs[0].state
  const transactionId = ("sentHash" in first && first.sentHash) || ("hash" in first && first.hash)
  if (!transactionId) return

  const stoppedAt = plan.legs.findIndex((leg) => leg.state.at === "failed")
  const stopped = plan.legs[stoppedAt]?.state
  const failure = stopped?.at === "failed" ? stopped.failure : undefined
  const row = await db.transactionsV2.get(transactionId)

  await flowTracker.settled(
    transactionId,
    {
      status: planStatusOf(failure),
      timeToSettleMs: toSettleMs(at - (row?.timestamp ?? plan.createdAt)),
      properties: {
        protocol: plan.summary.protocol,
        cross_chain:
          networkIdFromTokenId(plan.summary.fromTokenId) !==
          networkIdFromTokenId(plan.summary.toTokenId),
        plan_outcome: plan.phase,
        ...(failure && { stopped_at_leg: stoppedAt + 1, stop_reason: STOP_REASON[failure] }),
        ...(plan.pausedFor && { paused_for: plan.pausedFor }),
      },
    },
    Date.now()
  )
}
