import { isTokenDot } from "@talismn/chaindata-provider"
import { useMemo, useState } from "react"

import { useBalance, useNetworkById, useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useYieldTransaction } from "../hooks/useYieldTransaction"

export const useDepositFundsTransactionDot = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, tokenId } = useDepositWizard()
  const token = useToken(tokenId)
  const _network = useNetworkById(token?.networkId, "polkadot")
  const balance = useBalance(account as string, tokenId as string)

  // Get real transaction data from Yield.xyz API
  const {
    allTransactions,
    maxAmount: yieldMaxAmount,
    isLoading: isYieldLoading,
    error: yieldError,
  } = useYieldTransaction()

  // Use Yield.xyz transaction data only
  const [tx, error] = useMemo(() => {
    if (!isTokenDot(token) || !token.networkId || !token || !account) {
      return [undefined, undefined]
    }

    // Get the first transaction from Yield.xyz
    const firstTransaction = allTransactions[0]
    if (firstTransaction) {
      return [firstTransaction, yieldError]
    }

    // No fallback - return undefined if no Yield.xyz data
    return [undefined, yieldError]
  }, [account, token, allTransactions, yieldError])

  // Calculate max amount
  const maxAmount = useMemo(() => {
    // Use Yield.xyz max amount if available
    if (yieldMaxAmount) {
      return yieldMaxAmount
    }

    // Fallback to balance-based calculation
    if (!balance || !isTokenDot(token)) return null

    // For deposits, max amount is the full transferable balance
    return balance.transferable.planck?.toString() ?? "0"
  }, [yieldMaxAmount, balance, token])

  if (!isTokenDot(token)) return null

  return {
    platform: "polkadot" as const,
    tx: tx?.unsignedTransaction ? JSON.parse(tx.unsignedTransaction) : undefined,
    txDetails: {
      payload: tx?.unsignedTransaction ? JSON.parse(tx.unsignedTransaction) : undefined,
      estimatedFee: tx?.gasEstimate?.toString() || null,
    },
    priority: null, // Polkadot doesn't use priority like Ethereum
    gasSettingsByPriority: null, // Not applicable for Polkadot
    setCustomSettings: () => {}, // Not applicable for Polkadot
    setPriority: () => {}, // Not applicable for Polkadot
    networkUsage: null, // Not applicable for Polkadot
    estimatedFee: tx?.gasEstimate?.toString() || null,
    maxFee: null, // Not applicable for Polkadot
    maxAmount,
    isLoading: isYieldLoading,
    error: error,
    isLocked,
    setIsLocked,

    // Yield.xyz specific data
    yieldTransaction: tx,
    isYieldTransaction: !!tx,
  }
}
