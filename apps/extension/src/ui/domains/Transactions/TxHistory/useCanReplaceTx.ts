import { isNotNil } from "@talismn/util"
import { filterIsSameNetworkAndAddressTx, WalletTransaction } from "extension-core"
import { useMemo } from "react"

import { useTxHistory } from "./TxHistoryContext"

export const useCanReplaceTx = (tx: WalletTransaction) => {
  const { transactions } = useTxHistory()

  return useMemo(() => {
    if (!["pending", "unknown"].includes(tx.status)) return false
    if (typeof tx.nonce !== "number") return false

    const matchingNonces = transactions
      .filter(filterIsSameNetworkAndAddressTx(tx))
      .map((t) => t.nonce)
      .filter(isNotNil)
    if (!matchingNonces.length) return false

    // can only replace transaction that currently have highest nonce
    return tx.nonce === Math.max(...matchingNonces)
  }, [transactions, tx])
}
