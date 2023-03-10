import { EthGasSettings, EthGasSettingsLegacy } from "@core/domains/ethereum/types"
import {
  EthPriorityOptionNameEip1559,
  EthPriorityOptionNameLegacy,
} from "@core/domains/signing/types"
import { ethers } from "ethers"
import { useMemo } from "react"

import { useEthTransaction } from "./useEthTransaction"

type ReplacementType = "speed-up" | "cancel"

export const useEthReplaceTransaction = (
  tx: ethers.providers.TransactionRequest,
  type: ReplacementType,
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
      type: tx.type,
    }),
    [tx, type]
  )

  // TODO force maxPriorityFee (type 2) or gasPrice (type 1) to be 0.01 GWEI higher than the original tx ?
  return useEthTransaction(transaction, lock, true)
}
