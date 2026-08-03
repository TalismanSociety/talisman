import { db } from "@core/db"
import type { WalletTransaction, WalletTransactionEth } from "@core/domains/transactions/types"
import { isAddressEqual } from "@talismn/crypto"

// A cancel is a zero-value self-transfer with no calldata. Speed-ups keep the
// original calldata, so ERC-20 transactions (value 0) are not mistaken for cancels.
const isCancelTransaction = (tx: WalletTransactionEth) =>
  !!tx.isReplacement &&
  !!tx.payload.to &&
  isAddressEqual(tx.payload.to, tx.account) &&
  (!tx.payload.data || tx.payload.data === "0x")

/**
 * Resolves the transaction that actually carried out the tracked intent.
 *
 * After a speed-up, the original and the replacement compete for the same nonce
 * and either can mine. If the tracked hash lost that race, follow the same-nonce
 * transaction that mined instead — unless it's a cancel, in which case the
 * "replaced" status is the genuine outcome.
 */
export const getCanonicalTransaction = async (hash: string): Promise<WalletTransaction | null> => {
  const tx = (await db.transactionsV2.get(hash)) ?? null
  if (tx?.platform !== "ethereum" || tx.status !== "replaced") return tx

  const winner = await db.transactionsV2
    .filter(
      (row) =>
        row.platform === "ethereum" &&
        row.id !== tx.id &&
        row.networkId === tx.networkId &&
        row.nonce === tx.nonce &&
        ["success", "error"].includes(row.status) &&
        isAddressEqual(row.account, tx.account)
    )
    .first()

  return winner?.platform === "ethereum" && !isCancelTransaction(winner) ? winner : tx
}
