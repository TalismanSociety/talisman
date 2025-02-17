import { filterIsSameNetworkAndAddressTx, WalletTransaction } from "extension-core"
import { useMemo } from "react"

import { useTxHistory } from "./TxHistoryContext"

export const useCanReplaceTx = (tx: WalletTransaction) => {
  const { transactions } = useTxHistory()

  return useMemo(() => {
    if (!["pending", "unknown"].includes(tx.status)) return false

    // can only replace transaction that currently have highest nonce
    return (
      tx.nonce ===
      Math.max(...transactions.filter(filterIsSameNetworkAndAddressTx(tx)).map((t) => t.nonce))
    )
  }, [transactions, tx])
}
