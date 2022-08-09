import { TransactionStatus } from "@core/domains/transactions/types"
import { TransactionReceipt, TransactionResponse } from "@ethersproject/abstract-provider"
import * as Sentry from "@sentry/browser"
import { useCallback, useEffect, useMemo, useState } from "react"
import urlJoin from "url-join"

import { useEthereumProvider } from "../domains/Ethereum/useEthereumProvider"
import { useEvmNetwork } from "./useEvmNetwork"

export const useEvmTransactionWatch = (
  evmNetworkId: number,
  evmTxHash: string,
  confirmations = 1
) => {
  const evmNetwork = useEvmNetwork(evmNetworkId)
  const provider = useEthereumProvider(evmNetworkId)

  const [txReceipt, setTxReceipt] = useState<TransactionReceipt>()
  const [error, setError] = useState<string>()

  const waitForTransaction = useCallback(async () => {
    setError(undefined)
    try {
      if (!provider || !evmTxHash) {
        setTxReceipt(undefined)
      } else {
        setTxReceipt(await provider?.waitForTransaction(evmTxHash, confirmations))
      }
    } catch (err) {
      setError("Failed to get transaction receipt")
      Sentry.captureException(err, { tags: { evmNetworkId: provider?.network?.chainId } })
    }
  }, [confirmations, evmTxHash, provider])

  useEffect(() => {
    waitForTransaction()
  }, [waitForTransaction])

  const { blockHash, blockNumber, message, status } = useMemo(() => {
    const blockHash = txReceipt?.blockHash
    const blockNumber = txReceipt?.blockNumber?.toString()
    const status = (
      txReceipt ? (txReceipt?.blockNumber ? "SUCCESS" : "ERROR") : "PENDING"
    ) as TransactionStatus
    const message = txReceipt
      ? txReceipt?.blockNumber
        ? "Transaction successful"
        : "Transaction failed"
      : "Please wait"
    return { blockHash, blockNumber, message, status }
  }, [txReceipt])

  const href = useMemo(() => {
    if (!evmNetwork?.explorerUrl) return undefined
    return urlJoin(evmNetwork?.explorerUrl, "tx", evmTxHash)
  }, [evmNetwork?.explorerUrl, evmTxHash])

  return { blockHash, blockNumber, message, status, href }
}
