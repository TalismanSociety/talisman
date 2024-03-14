import { parseTransactionRequest } from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"
import { TransactionRequest } from "viem"

import { TxReplaceType } from "../Transactions"
import { useEthTransaction } from "./useEthTransaction"

export const useEthReplaceTransaction = (
  txToReplace: TransactionRequest<string>,
  evmNetworkId: EvmNetworkId,
  type: TxReplaceType,
  lock?: boolean
) => {
  const replaceTx = useMemo(() => {
    const parsed = parseTransactionRequest(txToReplace)

    const newTx: TransactionRequest =
      txToReplace.type === "eip1559"
        ? {
            type: "eip1559",
            from: parsed.from,
            maxPriorityFeePerGas: parsed.maxPriorityFeePerGas,
          }
        : {
            type: "legacy",
            from: parsed.from,
            gasPrice: parsed.gasPrice,
          }

    newTx.nonce = parsed.nonce
    newTx.to = type === "cancel" ? parsed.from : parsed.to
    newTx.value = type === "cancel" ? 0n : parsed.value
    if (type === "speed-up") newTx.data = parsed.data

    return newTx
  }, [txToReplace, type])

  return useEthTransaction(replaceTx, evmNetworkId, lock, true)
}
