import { TransactionStatus } from "@core/domains/transactions"
import { TransactionReceipt } from "@ethersproject/abstract-provider"
import * as Sentry from "@sentry/browser"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useCallback, useEffect, useMemo, useState } from "react"
import urlJoin from "url-join"

import { useEthereumProvider } from "../domains/Ethereum/useEthereumProvider"
import { useEvmNetwork } from "./useEvmNetwork"

// unused anymore but could be useful someday
export const useEvmTransactionWatch = (
  evmNetworkId: EvmNetworkId,
  hash: string,
  confirmations = 1
) => {
  const evmNetwork = useEvmNetwork(evmNetworkId)
  const provider = useEthereumProvider(evmNetworkId)

  const [txReceipt, setTxReceipt] = useState<TransactionReceipt>()
  const [error, setError] = useState<Error>()

  const waitForTransaction = useCallback(async () => {
    setError(undefined)
    try {
      if (!provider || !hash) {
        setTxReceipt(undefined)
      } else {
        setTxReceipt(await provider?.waitForTransaction(hash, confirmations))
      }
    } catch (err) {
      setError(err as Error)
      Sentry.captureException(err, { tags: { evmNetworkId: provider?.network?.chainId } })
    }
  }, [confirmations, hash, provider])

  useEffect(() => {
    waitForTransaction()
  }, [waitForTransaction])

  const { blockHash, blockNumber, message, status } = useMemo(() => {
    const blockHash = txReceipt?.blockHash
    const blockNumber = txReceipt?.blockNumber?.toString()

    const { status, message }: { status: TransactionStatus; message: string } = txReceipt
      ? txReceipt?.blockNumber && txReceipt.status
        ? { status: "success", message: "Transaction successful" }
        : { status: "error", message: "Transaction failed" }
      : { status: "pending", message: "Please wait" }

    return { blockHash, blockNumber, message, status }
  }, [txReceipt])

  const href = useMemo(() => {
    if (!evmNetwork?.explorerUrl) return undefined
    return urlJoin(evmNetwork?.explorerUrl, "tx", hash)
  }, [evmNetwork?.explorerUrl, hash])

  return { blockHash, blockNumber, message, status, href, error }
}
