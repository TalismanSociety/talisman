import { isTokenSol } from "@talismn/chaindata-provider"
import { useMemo, useState } from "react"

import { useBalance, useNetworkById, useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useYieldTransaction } from "../hooks/useYieldTransaction"

export const useDepositFundsTransactionSol = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, tokenId } = useDepositWizard()
  const token = useToken(tokenId)
  const _network = useNetworkById(token?.networkId, "solana")
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
    if (!isTokenSol(token) || !token.networkId || !token || !account) {
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
    if (!balance || !isTokenSol(token)) return null

    // For deposits, max amount is the full transferable balance
    return balance.transferable.planck?.toString() ?? "0"
  }, [yieldMaxAmount, balance, token])

  if (!isTokenSol(token)) return null

  // Helper function to safely parse unsigned transaction
  const parseUnsignedTransaction = (unsignedTx: unknown) => {
    if (!unsignedTx) return undefined

    if (typeof unsignedTx === "string") {
      try {
        // Try to parse as JSON first
        return JSON.parse(unsignedTx)
      } catch {
        // If JSON parsing fails, return the string as-is
        return unsignedTx
      }
    }

    // If it's already an object or number, return as-is
    return unsignedTx
  }

  return {
    platform: "solana" as const,
    tx: parseUnsignedTransaction(tx?.unsignedTransaction),
    txDetails: {
      payload: parseUnsignedTransaction(tx?.unsignedTransaction),
      estimatedFee: tx?.gasEstimate?.toString() || null,
    },
    priority: null, // Solana doesn't use priority like Ethereum
    gasSettingsByPriority: null, // Not applicable for Solana
    setCustomSettings: () => {}, // Not applicable for Solana
    setPriority: () => {}, // Not applicable for Solana
    networkUsage: null, // Not applicable for Solana
    estimatedFee: tx?.gasEstimate?.toString() || null,
    maxFee: null, // Not applicable for Solana
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
