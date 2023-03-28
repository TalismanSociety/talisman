import { TransactionStatus } from "@core/domains/transfers/types"
import { TransactionReceipt, TransactionResponse } from "@ethersproject/abstract-provider"
import * as Sentry from "@sentry/browser"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useCallback, useEffect, useMemo, useState } from "react"
import urlJoin from "url-join"

import { useEthereumProvider } from "../domains/Ethereum/useEthereumProvider"
import { useEvmNetwork } from "./useEvmNetwork"

export const useEvmTransactionWatch = (
  evmNetworkId: EvmNetworkId,
  evmTxHash: string,
  confirmations = 1
) => {
  const evmNetwork = useEvmNetwork(evmNetworkId)
  const provider = useEthereumProvider(evmNetworkId)

  const [txReceipt, setTxReceipt] = useState<TransactionReceipt>()
  const [error, setError] = useState<Error>()

  const waitForTransaction = useCallback(async () => {
    setError(undefined)
    try {
      if (!provider || !evmTxHash) {
        setTxReceipt(undefined)
      } else {
        setTxReceipt(await provider?.waitForTransaction(evmTxHash, confirmations))
      }
    } catch (err) {
      setError(err as Error)
      Sentry.captureException(err, { tags: { evmNetworkId: provider?.network?.chainId } })
    }
  }, [confirmations, evmTxHash, provider])

  useEffect(() => {
    waitForTransaction()
  }, [waitForTransaction])

  const { blockHash, blockNumber, message, status } = useMemo(() => {
    const blockHash = txReceipt?.blockHash
    const blockNumber = txReceipt?.blockNumber?.toString()

    const { status, message }: { status: TransactionStatus; message: string } = txReceipt
      ? txReceipt?.blockNumber && txReceipt.status
        ? { status: "SUCCESS", message: "Transaction successful" }
        : { status: "ERROR", message: "Transaction failed" }
      : { status: "PENDING", message: "Please wait" }

    return { blockHash, blockNumber, message, status }
  }, [txReceipt])

  const href = useMemo(() => {
    if (!evmNetwork?.explorerUrl) return undefined
    return urlJoin(evmNetwork?.explorerUrl, "tx", evmTxHash)
  }, [evmNetwork?.explorerUrl, evmTxHash])

  return { blockHash, blockNumber, message, status, href, error }
}
