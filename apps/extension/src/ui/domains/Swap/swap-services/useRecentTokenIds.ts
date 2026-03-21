import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { useTransactions } from "@ui/state/transactions"
import { useMemo } from "react"

/** Extract all token IDs referenced in a transaction's txInfo. */
const getTokenIdsFromTxInfo = (txInfo: WalletTransactionInfo): string[] => {
  switch (txInfo.type) {
    case "transfer":
    case "approve-erc20":
      return [txInfo.tokenId]
    case "swap-simpleswap":
    case "swap-stealthex":
    case "swap-lifi":
    case "bittensor-staking":
      return [txInfo.fromTokenId, txInfo.toTokenId]
    default:
      return []
  }
}

/**
 * Returns unique token IDs from the user's transaction history,
 * ordered by most recently used first.
 *
 * Extracts token IDs from all transaction types (transfers, swaps, staking, approvals)
 * across all accounts. Transactions are already sorted newest-first by `useTransactions`.
 */
export const useRecentTokenIds = (): string[] => {
  const transactions = useTransactions()

  return useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []

    for (const tx of transactions) {
      if (!tx.txInfo) continue

      for (const tokenId of getTokenIdsFromTxInfo(tx.txInfo)) {
        if (!seen.has(tokenId)) {
          seen.add(tokenId)
          ordered.push(tokenId)
        }
      }
    }

    return ordered
  }, [transactions])
}
