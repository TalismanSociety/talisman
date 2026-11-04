import { SWAP_OUTCOMES, type SwapOutcome, swapOfTransaction } from "@common/analytics/funds"
import { toSettleMs } from "@common/analytics/schema"
import { type SettledStatus, txTypeOf } from "@common/analytics/transactions"

import type { TxStatusFact, TxStatusReason } from "../transactions/store.transactions"
import type { SwapStatus, TransactionStatus, WalletTransaction } from "../transactions/types"
import type { SwapOutcomeFact } from "../transactions/watchSwapStatus"
import { flowTracker } from "./flowTracker"
import { track } from "./track"
import { analyticsNetworkId, signerOfAddress } from "./txContext"

const isEarlierSwapLeg = (row: WalletTransaction) => row.txInfo?.swapRun?.isLastLeg === false

const swapFlowLink = (row: WalletTransaction) => row.txInfo?.swapRun?.firstLegHash ?? row.id

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

export const trackTxSettled = async ({ row, from, to, reason, at }: TxStatusFact) => {
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
  if ((swap || isEarlierSwapLeg(row)) && status === "success") return
  await flowTracker.settled(
    swapFlowLink(row),
    { status, timeToSettleMs, ...(swap && { properties: swap }) },
    Date.now()
  )
}

const isSwapOutcome = (status: SwapStatus): status is SwapOutcome =>
  (SWAP_OUTCOMES as readonly string[]).includes(status)

export const trackSwapOutcome = async ({ row, status, at }: SwapOutcomeFact) => {
  const swap = swapOfTransaction(row.txInfo)
  if (!swap || !isSwapOutcome(status)) return
  if (status === "finished" && isEarlierSwapLeg(row)) return
  await flowTracker.settled(
    swapFlowLink(row),
    {
      status: "success",
      timeToSettleMs: toSettleMs(at - row.timestamp),
      properties: { ...swap, swap_status: status },
    },
    Date.now()
  )
}
