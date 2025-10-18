import { isTokenSol } from "@talismn/chaindata-provider"
import { useEffect, useMemo, useState } from "react"

import { useBalance, useToken } from "@ui/state"
import { getFrontEndSolanaConnection } from "@ui/util/solana/useSolanaConnection"

import { isVersionedTransaction } from "../../../../inject/solana/solana"
import { deserializeTransactionFromHex } from "../../../../inject/solana/util"
import { useDepositWizard } from "../context/DepositWizardContext"
import { useYieldTransaction } from "../hooks/useYieldTransaction"

export const useDepositFundsTransactionSol = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, tokenId } = useDepositWizard()
  const token = useToken(tokenId)
  const balance = useBalance(account as string, tokenId as string)

  // Get Yield API transaction data for the actual transaction
  const { allTransactions, isLoading: isYieldLoading, error: yieldError } = useYieldTransaction()

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

  // State to store the estimated fee
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null)

  // Parse the transaction for submission (wait for Yield API to respond)
  const parsedTransaction = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) return undefined

    const firstTransaction = allTransactions[0]
    if (!firstTransaction?.unsignedTransaction) return undefined

    try {
      // Deserialize the base58-encoded transaction
      const unsignedTx =
        typeof firstTransaction.unsignedTransaction === "string"
          ? firstTransaction.unsignedTransaction
          : JSON.stringify(firstTransaction.unsignedTransaction)

      return deserializeTransactionFromHex(unsignedTx) ?? undefined
    } catch (error) {
      return undefined
    }
  }, [allTransactions])

  // Calculate max amount that can be spent (balance - transaction fees)
  const maxAmount = useMemo(() => {
    if (!balance || !estimatedFee) return null

    const userBalance = balance.transferable.planck
    const feeInPlanck = BigInt(estimatedFee)

    // Conservative approach: only subtract the transaction fee
    // Rent-exempt reserves vary by account type and are handled by the Yield API
    const maxSpendable = userBalance - feeInPlanck
    return maxSpendable > 0n ? maxSpendable.toString() : "0"
  }, [balance, estimatedFee])

  // Effect to calculate gas estimate when allTransactions changes
  useEffect(() => {
    const calculateFee = async () => {
      if (!parsedTransaction || !token?.networkId) {
        setEstimatedFee(null)
        return
      }

      try {
        // Get Solana connection and estimate fee
        const connection = getFrontEndSolanaConnection(token.networkId)
        if (!connection) {
          setEstimatedFee(null)
          return
        }

        const result = await connection.getFeeForMessage(
          isVersionedTransaction(parsedTransaction)
            ? parsedTransaction.message
            : parsedTransaction.compileMessage(),
        )

        setEstimatedFee(result.value ? String(result.value) : null)
      } catch (error) {
        setEstimatedFee(null)
      }
    }

    calculateFee()
  }, [parsedTransaction, token?.networkId])

  if (!isTokenSol(token)) return null

  return {
    platform: "solana" as const,
    tx: parsedTransaction, // Return the parsed transaction for submission
    txDetails: {
      payload: parsedTransaction,
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
    allTransactions: allTransactions,
    parsedTransactions: allTransactions
      .filter((tx) => tx.unsignedTransaction)
      .map((tx) => {
        try {
          const unsignedTx =
            typeof tx.unsignedTransaction === "string"
              ? tx.unsignedTransaction
              : JSON.stringify(tx.unsignedTransaction)
          return deserializeTransactionFromHex(unsignedTx)
        } catch {
          return null
        }
      })
      .filter(Boolean),
  }
}
