import { isTokenEth } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { useMemo, useState } from "react"
import { TransactionRequest } from "viem"

import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useToken, useTokens } from "@ui/state"

import { useClaimWizard } from "../context/ClaimWizardContext"
import { useClaimTransaction } from "../hooks/useClaimTransaction"
import { mapYieldTokenToTokenId } from "../utils/tokenMapping"

// Helper function to safely parse unsigned transaction
const parseUnsignedTransaction = (unsignedTx: unknown): Record<string, unknown> | null => {
  if (typeof unsignedTx === "string") {
    try {
      return JSON.parse(unsignedTx)
    } catch {
      return null
    }
  }
  return unsignedTx as Record<string, unknown> | null
}

export const useClaimFundsTransactionEth = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, balance } = useClaimWizard()
  const tokens = useTokens()

  // Get token ID from balance data using mapping function
  const tokenId = useMemo(() => {
    if (!balance?.token || !tokens) return ""
    return (
      mapYieldTokenToTokenId(
        balance.token.address || balance.token.symbol,
        balance.token.network,
        tokens,
      ) || ""
    )
  }, [balance?.token, tokens])

  const token = useToken(tokenId) // Get token from mapped token ID

  const {
    allTransactions,
    maxAmount: yieldMaxAmount,
    isLoading: isYieldLoading,
    error: yieldError,
  } = useClaimTransaction()

  // Use Yield API transaction data if available, otherwise fallback to standard transfer
  const [tx, error] = useMemo(() => {
    if (
      !token ||
      !isTokenEth(token) ||
      !token.networkId ||
      !account ||
      !isEthereumAddress(account)
    ) {
      return [undefined, undefined]
    }

    // Get all transactions from Yield API and parse them
    if (allTransactions.length > 0) {
      const parsedTransactions = allTransactions
        .filter((tx: { unsignedTransaction?: unknown }) => tx.unsignedTransaction)
        .map((tx: { unsignedTransaction: unknown }) =>
          parseUnsignedTransaction(tx.unsignedTransaction),
        )
        .filter(Boolean)

      if (parsedTransactions.length > 0) {
        // For now, return the first transaction for fee estimation
        // The SequentialTransactionExecutor will handle all transactions
        return [parsedTransactions[0], yieldError]
      }
    }

    return [undefined, yieldError]
  }, [account, token, allTransactions, yieldError])

  // Only estimate fees when we have the Yield API transaction data
  const shouldEstimateFees = !isYieldLoading && allTransactions.length > 0
  const result = useEthTransaction(
    // Only pass transaction if Yield API has responded
    shouldEstimateFees && tx ? (tx as TransactionRequest) : undefined,
    token?.networkId,
    isLocked,
    false,
  )

  const maxAmount = useMemo(() => {
    // Use Yield API max amount if available
    if (yieldMaxAmount) {
      return yieldMaxAmount
    }

    if (!token || !result.txDetails?.maxFee) return null

    // For claims, max amount is typically the claimable amount
    return null // Claims don't have a max amount concept like deposits
  }, [yieldMaxAmount, token, result.txDetails?.maxFee])

  if (!isTokenEth(token)) return null

  return {
    platform: "ethereum" as const,
    tx: result.transaction,
    txDetails: result.txDetails,
    priority: result.priority,
    gasSettingsByPriority: result.gasSettingsByPriority,
    setCustomSettings: result.setCustomSettings,
    setPriority: result.setPriority,
    networkUsage: result.networkUsage,
    estimatedFee: result.txDetails?.estimatedFee,
    maxFee: result.txDetails?.maxFee,
    maxAmount,
    isLoading: isYieldLoading || result.isLoading,
    error: error || result.error,
    isLocked,
    setIsLocked,
    // Yield API specific data for SequentialTransactionExecutor
    allTransactions: allTransactions,
    parsedTransactions: allTransactions
      .filter((tx: { unsignedTransaction?: unknown }) => tx.unsignedTransaction)
      .map((tx: { unsignedTransaction: unknown }) =>
        parseUnsignedTransaction(tx.unsignedTransaction),
      )
      .filter(Boolean),
  }
}
