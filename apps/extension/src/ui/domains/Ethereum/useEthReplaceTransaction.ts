import { ethers } from "ethers"
import { useMemo } from "react"

import { TxReplaceType } from "../Transactions"
import { useEthTransaction } from "./useEthTransaction"

export const useEthReplaceTransaction = (
  tx: ethers.providers.TransactionRequest,
  type: TxReplaceType,
  lock?: boolean
) => {
  const transaction: ethers.providers.TransactionRequest = useMemo(
    () => ({
      chainId: tx.chainId,
      from: tx.from,
      to: type === "cancel" ? tx.from : tx.to,
      value: type === "cancel" ? "0" : tx.value,
      data: type === "cancel" ? undefined : tx.data,
      nonce: tx.nonce,

      // pass previous tx gas data
      type: tx.type,
      gasPrice: tx.gasPrice,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
    }),
    [tx, type]
  )

  return useEthTransaction(transaction, lock, true)
}
