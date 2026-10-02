import { toDurationMs } from "@common/analytics/schema"
import { type SettledStatus, txTypeOf } from "@common/analytics/transactions"

import type { TxStatusFact, TxStatusReason } from "../transactions/store.transactions"
import type { TransactionStatus } from "../transactions/types"
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
  track("tx_settled", {
    status,
    platform: row.platform,
    network_id: networkId,
    tx_type: txTypeOf(row.txInfo),
    time_to_settle_ms: toDurationMs(at - row.timestamp),
    submitted_by: row.siteUrl ? "dapp" : "wallet",
    ...(signer && { signer }),
  })
}
