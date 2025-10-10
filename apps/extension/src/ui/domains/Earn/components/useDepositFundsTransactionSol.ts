import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { isTokenSol } from "@talismn/chaindata-provider"
import { useMemo, useState } from "react"

import { useBalance, useToken } from "@ui/state"

import { deserializeTransactionFromBase64 } from "../../../../inject/solana/util"
import { useDepositWizard } from "../context/DepositWizardContext"
import { useYieldTransaction } from "../hooks/useYieldTransaction"

export const useDepositFundsTransactionSol = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, tokenId } = useDepositWizard()
  const token = useToken(tokenId)
  const balance = useBalance(account as string, tokenId as string)

  // Get Yield API transaction data for the actual transaction
  const {
    allTransactions,
    maxAmount: yieldMaxAmount,
    isLoading: isYieldLoading,
    error: yieldError,
  } = useYieldTransaction()

  // Use Yield.xyz transaction data only
  const [tx, error] = useMemo(() => {
    if (!isTokenSol(token) || !account) {
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

  // Helper function to deserialize base64-encoded Solana transaction from Yield API
  const parseTransaction = (unsignedTx: string): Transaction | VersionedTransaction | undefined => {
    try {
      // First, try to parse as JSON (like Ethereum does)
      try {
        JSON.parse(unsignedTx)
        // If it's a JSON object, it might be a structured transaction
        // For now, return undefined as we need to handle this differently
        return undefined
      } catch (jsonError) {
        // Not JSON, use the base64 deserializer utility
        return deserializeTransactionFromBase64(unsignedTx)
      }
    } catch (error) {
      return undefined
    }
  }

  // Helper function to extract fee from Yield API gasEstimate and convert to planck
  const getEstimatedFee = () => {
    if (!tx?.gasEstimate) return null
    try {
      const gasEstimate =
        typeof tx.gasEstimate === "string" ? JSON.parse(tx.gasEstimate) : tx.gasEstimate

      const amount = gasEstimate?.amount
      if (!amount) return null

      // Convert decimal SOL amount to planck units (multiply by 10^9)
      const solAmount = parseFloat(amount)
      const planckAmount = Math.floor(solAmount * 1_000_000_000) // 10^9 for SOL decimals
      return planckAmount.toString()
    } catch {
      return null
    }
  }

  if (!isTokenSol(token)) return null

  // Parse the transaction for submission
  const parsedTransaction = tx?.unsignedTransaction
    ? parseTransaction(
        typeof tx.unsignedTransaction === "string"
          ? tx.unsignedTransaction
          : JSON.stringify(tx.unsignedTransaction),
      )
    : undefined

  // Get the estimated fee (this works regardless of transaction parsing)
  const estimatedFee = getEstimatedFee()

  // For Yield API transactions, we need to ensure we always have a transaction object
  // If parsing failed, we need to handle this gracefully
  const finalTransaction = parsedTransaction

  // If we have Yield API data but can't parse the transaction, return null
  // This prevents the deposit button from appearing with invalid transaction data
  if (tx?.unsignedTransaction && !parsedTransaction) {
    return null
  }

  return {
    platform: "solana" as const,
    tx: finalTransaction,
    txDetails: {
      payload: finalTransaction,
      estimatedFee: estimatedFee,
    },
    priority: null, // Solana doesn't use priority like Ethereum
    gasSettingsByPriority: null, // Not applicable for Solana
    setCustomSettings: () => {}, // Not applicable for Solana
    setPriority: () => {}, // Not applicable for Solana
    networkUsage: null, // Not applicable for Solana
    estimatedFee: estimatedFee,
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
