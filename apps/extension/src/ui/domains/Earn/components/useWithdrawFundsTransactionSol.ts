import { deserializeTransactionFromHex, isVersionedTransaction } from "@talismn/solana"
import { useEffect, useMemo, useState } from "react"

import { useToken, useTokens } from "@ui/state"
import { getFrontEndSolanaConnection } from "@ui/util/solana/useSolanaConnection"

import { useWithdrawWizard } from "../context/WithdrawWizardContext"
import { useWithdrawTransaction } from "../hooks/useWithdrawTransaction"
import { mapYieldTokenToTokenId } from "../utils/tokenMapping"

// Solana withdraw transaction hook - updated
export const useWithdrawFundsTransactionSol = (
  withdrawTransactionData: ReturnType<typeof useWithdrawTransaction>,
) => {
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null)
  const { balance, tokenId } = useWithdrawWizard()
  const tokens = useTokens()

  // Use the transaction data passed from the selector hook
  const {
    allTransactions,
    maxAmount: _yieldMaxAmount,
    isLoading: isYieldLoading,
    error: yieldError,
  } = withdrawTransactionData

  // Get token ID from context first, fallback to balance mapping
  const mappedTokenId = useMemo(() => {
    if (tokenId) return tokenId
    if (!balance?.token || !tokens) return ""
    return (
      mapYieldTokenToTokenId(
        balance.token.address || balance.token.symbol,
        balance.token.network,
        tokens,
      ) || ""
    )
  }, [tokenId, balance?.token, tokens])

  const token = useToken(mappedTokenId)

  // Parse transaction and calculate estimated fee dynamically
  const parsedTransaction = useMemo(() => {
    if (!allTransactions?.[0]) return null

    const transaction = allTransactions[0]
    if (transaction.unsignedTransaction) {
      try {
        // Handle both string and object types for unsignedTransaction
        let transactionHex: string
        if (typeof transaction.unsignedTransaction === "string") {
          transactionHex = transaction.unsignedTransaction
        } else {
          return null
        }

        return deserializeTransactionFromHex(transactionHex)
      } catch {
        return null
      }
    }
    return null
  }, [allTransactions])

  // Calculate estimated fee dynamically
  useEffect(() => {
    if (!parsedTransaction || !token) {
      setEstimatedFee(null)
      return
    }

    const connection = getFrontEndSolanaConnection(token.networkId)

    if (connection) {
      connection
        .getFeeForMessage(
          isVersionedTransaction(parsedTransaction)
            ? parsedTransaction.message
            : parsedTransaction.compileMessage(),
        )
        .then((result) => {
          setEstimatedFee(result.value ? String(result.value) : "5000")
        })
        .catch(() => {
          setEstimatedFee("5000") // Fallback to default fee
        })
    } else {
      setEstimatedFee("5000") // Fallback to default fee
    }
  }, [parsedTransaction, token])

  return {
    platform: "solana" as const,
    tx: parsedTransaction,
    txDetails: {
      estimatedFee: estimatedFee ? BigInt(estimatedFee) : undefined,
    },
    priority: null, // Solana doesn't use priority like Ethereum
    gasSettingsByPriority: null, // Not applicable for Solana
    setCustomSettings: () => {}, // Not applicable for Solana
    setPriority: () => {}, // Not applicable for Solana
    networkUsage: null, // Not applicable for Solana
    isLoading: isYieldLoading || false,
    error: yieldError || null,
    allTransactions: allTransactions,
  }
}
