import { SWAP_OUTCOMES, type SwapOutcome, swapOfTransaction } from "@common/analytics/funds"
import { toDurationMs } from "@common/analytics/schema"
import { type SettledStatus, txTypeOf } from "@common/analytics/transactions"

import type { TxStatusFact, TxStatusReason } from "../transactions/store.transactions"
import type { SwapStatus, TransactionStatus } from "../transactions/types"
import type { SwapOutcomeFact } from "../transactions/watchSwapStatus"
import { flowTracker } from "./flowTracker"
import { track } from "./track"
import { analyticsNetworkId, signerOfAddress } from "./txContext"

const isFinal = (status: TransactionStatus) =>
  status === "success" || status === "error" || status === "replaced"

/**
 * One tx_settled per transaction, on its first entry into a final status: a later correction
 * (finality rewriting success into error) sends nothing. "unknown" is not final: the cleanup
 * settles it later.
 */
export const settledStatusOf = (
  from: TransactionStatus,
  to: TransactionStatus,
  reason: TxStatusReason
): SettledStatus | null => {
  if (isFinal(from) || !isFinal(to)) return null
  if (reason === "dropped") return "dropped"
  // the restart pass marks the losers of a nonce another transaction already won
  if (reason === "restart") return "replaced"
  return to as SettledStatus
}

export const trackTxSettled = async ({ row, from, to, reason, at }: TxStatusFact) => {
  const status = settledStatusOf(from, to, reason)
  if (!status) return

  const [networkId, signer] = await Promise.all([
    analyticsNetworkId({ networkId: row.networkId }),
    signerOfAddress(row.account),
  ])
  const timeToSettleMs = toDurationMs(at - row.timestamp)
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
  // its exchange status watcher starts now, and ends the flow with trackSwapOutcome
  if (swap && status === "success") return
  await flowTracker.settled(
    row.id,
    { status, timeToSettleMs, ...(swap && { properties: swap }) },
    Date.now()
  )
}

const isSwapOutcome = (status: SwapStatus): status is SwapOutcome =>
  (SWAP_OUTCOMES as readonly string[]).includes(status)

/** A swap ends when the exchange the wallet watches does: its transaction succeeded earlier. */
export const trackSwapOutcome = async ({ row, status, at }: SwapOutcomeFact) => {
  const swap = swapOfTransaction(row.txInfo)
  if (!swap || !isSwapOutcome(status)) return
  await flowTracker.settled(
    row.id,
    {
      status: "success",
      timeToSettleMs: toDurationMs(at - row.timestamp),
      properties: { ...swap, swap_status: status },
    },
    Date.now()
  )
}
