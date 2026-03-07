import { provideContext } from "@ui/util/provideContext"
import { useCallback, useState } from "react"

type SwapTxInfo = {
  hash: string
  label: string
}

const useSwapTxWatcherProvider = () => {
  const [transactions, setTransactions] = useState<SwapTxInfo[]>([])

  const addTransaction = useCallback((tx: SwapTxInfo) => {
    setTransactions((prev) =>
      prev.some((existing) => existing.hash === tx.hash) ? prev : [...prev, tx]
    )
  }, [])

  const removeTransaction = useCallback((hash: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.hash !== hash))
  }, [])

  return {
    transactions,
    addTransaction,
    removeTransaction,
  }
}

export const [SwapTxWatcherProvider, useSwapTxWatcher] = provideContext(useSwapTxWatcherProvider)
