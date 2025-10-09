import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js"
import { isTokenSol } from "@talismn/chaindata-provider"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

import { useBalance, useToken } from "@ui/state"
import { useSolanaConnection } from "@ui/util/solana/useSolanaConnection"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useYieldTransaction } from "../hooks/useYieldTransaction"

export const useDepositFundsTransactionSol = () => {
  const [isLocked, setIsLocked] = useState(false)
  const queryClient = useQueryClient()
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

  const connection = useSolanaConnection(token?.networkId)

  // Use Yield API transaction data if available, otherwise fallback to standard transfer
  const [tx, error] = useMemo(() => {
    if (!isTokenSol(token) || !account) {
      return [undefined, undefined]
    }

    // Get all transactions from Yield API and parse them
    if (allTransactions.length > 0) {
      const parsedTransactions = allTransactions
        .filter((tx) => tx.unsignedTransaction)
        .map((tx) => parseUnsignedTransaction(tx.unsignedTransaction))
        .filter(Boolean)

      if (parsedTransactions.length > 0) {
        // For now, return the first transaction for fee estimation
        // The SequentialTransactionExecutor will handle all transactions
        return [parsedTransactions[0], yieldError]
      }
    }

    // Fallback to standard transfer (this shouldn't happen for yield operations)
    return [undefined, yieldError]
  }, [account, token, allTransactions, yieldError])

  // Force fee estimation when yield loading completes
  useEffect(() => {
    if (!isYieldLoading && allTransactions.length > 0 && tx) {
      queryClient.invalidateQueries({
        queryKey: ["useDepositFundsSolEstimateFee"],
      })
    }
  }, [isYieldLoading, allTransactions.length, tx, queryClient])

  // Get standard Solana fee estimation using the actual transaction
  const qEstimatedFee = useEstimatedFee({
    transaction: tx,
    connection,
    isLocked,
    enabled: !isYieldLoading && allTransactions.length > 0 && !!tx,
  })

  // Calculate max amount
  const maxAmount = useMemo(() => {
    // Use Yield API max amount if available
    if (yieldMaxAmount) {
      return yieldMaxAmount
    }

    if (!balance || !isTokenSol(token)) return null

    switch (token.type) {
      case "sol-native": {
        if (!qEstimatedFee.data) return null
        const val = balance.transferable.planck - BigInt(qEstimatedFee.data)
        return String(val > 0n ? val : 0n)
      }
      default:
        return balance.transferable.planck ? String(balance.transferable.planck) : "0"
    }
  }, [yieldMaxAmount, balance, token, qEstimatedFee.data])

  if (!isTokenSol(token)) return null

  return {
    platform: "solana" as const,
    tx: tx,
    txDetails: {
      payload: tx,
      estimatedFee: qEstimatedFee.data,
    },
    priority: null, // Solana doesn't use priority like Ethereum
    gasSettingsByPriority: null, // Not applicable for Solana
    setCustomSettings: () => {}, // Not applicable for Solana
    setPriority: () => {}, // Not applicable for Solana
    networkUsage: null, // Not applicable for Solana
    estimatedFee: qEstimatedFee.data,
    maxFee: null, // Not applicable for Solana
    maxAmount,
    isLoading: isYieldLoading || qEstimatedFee.isLoading,
    error: error || qEstimatedFee.error,
    isLocked,
    setIsLocked,
    // Yield API specific data for SequentialTransactionExecutor
    allTransactions: allTransactions,
    parsedTransactions: allTransactions
      .filter((tx) => tx.unsignedTransaction)
      .map((tx) => parseUnsignedTransaction(tx.unsignedTransaction))
      .filter(Boolean),
  }
}

// Helper function to safely parse unsigned transaction
const parseUnsignedTransaction = (unsignedTx: unknown) => {
  if (!unsignedTx) return undefined

  if (typeof unsignedTx === "string") {
    try {
      return JSON.parse(unsignedTx)
    } catch {
      return unsignedTx
    }
  }

  return unsignedTx
}

const useEstimatedFee = ({
  transaction,
  connection,
  isLocked,
  enabled = true,
}: {
  transaction: Transaction | VersionedTransaction | null | undefined
  connection: Connection | null
  isLocked: boolean
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: ["useDepositFundsSolEstimateFee", transaction, connection?.rpcEndpoint],
    queryFn: async () => {
      if (!transaction || !connection?.rpcEndpoint) return null

      // Handle both Transaction and VersionedTransaction
      let message
      if (transaction instanceof Transaction) {
        message = transaction.compileMessage()
      } else if (transaction instanceof VersionedTransaction) {
        message = transaction.message
      } else {
        // If it's a parsed object from Yield API, we can't estimate fees directly
        return null
      }

      const result = await connection.getFeeForMessage(message)
      return result.value ? String(result.value) : null
    },
    refetchInterval: !isLocked && 6_000, // refresh fee every 60 seconds
    enabled: enabled && !!transaction && !!connection?.rpcEndpoint, // Only run when enabled and we have required data
    staleTime: 0, // Always consider data stale to ensure fresh estimates
  })
}
