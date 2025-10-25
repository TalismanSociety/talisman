import { isTokenSol } from "@talismn/chaindata-provider"
import { useEffect, useMemo, useState } from "react"

import { useBalance, useToken, useTokens } from "@ui/state"
import { getFrontEndSolanaConnection } from "@ui/util/solana/useSolanaConnection"

import { isVersionedTransaction } from "../../../../inject/solana/solana"
import { useClaimWizard } from "../context/ClaimWizardContext"
import { useClaimTransaction } from "../hooks/useClaimTransaction"
import { mapYieldTokenToTokenId } from "../utils/tokenMapping"

export const useClaimFundsTransactionSol = () => {
  const [isLocked, setIsLocked] = useState(false)
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null)
  const { account, balance: claimBalance } = useClaimWizard()
  const tokens = useTokens()

  // Get token ID from balance data using mapping function
  const tokenId = useMemo(() => {
    if (!claimBalance?.token || !tokens) return ""
    return (
      mapYieldTokenToTokenId(
        claimBalance.token.address || claimBalance.token.symbol,
        claimBalance.token.network,
        tokens,
      ) || ""
    )
  }, [claimBalance?.token, tokens])

  const token = useToken(tokenId) // Get token from mapped token ID
  const balance = useBalance(account as string, tokenId)

  const { allTransactions, isLoading: isYieldLoading, error: yieldError } = useClaimTransaction()

  // Parse the first transaction for Solana
  const parsedTransaction = useMemo(() => {
    if (allTransactions.length === 0) return null

    const firstTransaction = allTransactions[0]
    if (!firstTransaction?.unsignedTransaction) return null

    try {
      const unsignedTx =
        typeof firstTransaction.unsignedTransaction === "string"
          ? JSON.parse(firstTransaction.unsignedTransaction)
          : firstTransaction.unsignedTransaction

      return unsignedTx
    } catch (error) {
      return null
    }
  }, [allTransactions])

  // Calculate max amount (for Solana, this is typically the claimable amount)
  const maxAmount = useMemo(() => {
    if (!balance || !isTokenSol(token)) return null

    // For claims, max amount is the claimable amount, not limited by balance
    return null // Claims don't have a max amount concept like deposits
  }, [balance, token])

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
    tx: parsedTransaction,
    txDetails: {
      estimatedFee: estimatedFee ? BigInt(estimatedFee) : undefined,
    },
    maxAmount,
    isLoading: isYieldLoading,
    error: yieldError,
    isLocked,
    setIsLocked,
    // Yield API specific data for SequentialTransactionExecutor
    allTransactions: allTransactions,
    parsedTransactions: allTransactions
      .filter((tx: { unsignedTransaction?: unknown }) => tx.unsignedTransaction)
      .map((tx: { unsignedTransaction: unknown }) => {
        try {
          return typeof tx.unsignedTransaction === "string"
            ? JSON.parse(tx.unsignedTransaction)
            : tx.unsignedTransaction
        } catch {
          return null
        }
      })
      .filter(Boolean),
  }
}
