import { isTokenEth } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { useMemo, useState } from "react"
import { TransactionRequest } from "viem"

import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useToken, useTokens } from "@ui/state"

import { useWithdrawWizard } from "../context/WithdrawWizardContext"
import { useWithdrawTransaction } from "../hooks/useWithdrawTransaction"
import { mapYieldTokenToTokenId } from "../utils/tokenMapping"

// Helper function to safely parse unsigned transaction
const parseUnsignedTransaction = (unsignedTx: unknown): TransactionRequest | undefined => {
  if (!unsignedTx) return undefined

  let parsedTx
  if (typeof unsignedTx === "string") {
    try {
      parsedTx = JSON.parse(unsignedTx)
    } catch {
      return undefined
    }
  } else {
    parsedTx = unsignedTx
  }

  // Validate required fields
  if (!parsedTx.to || !parsedTx.data || !parsedTx.from) {
    return undefined
  }

  // Convert to proper transaction format with correct types
  // IMPORTANT: Do NOT include gas, maxFeePerGas, maxPriorityFeePerGas, or gasPrice from Yield.xyz API
  // Let useEthTransaction re-estimate gas with proper safety margins and user priority settings
  return {
    to: parsedTx.to as `0x${string}`,
    value: BigInt(parsedTx.value || "0"),
    data: parsedTx.data as `0x${string}`,
    from: parsedTx.from as `0x${string}`,
    // gas, maxFeePerGas, maxPriorityFeePerGas, and gasPrice will be set by useEthTransaction
    nonce: parsedTx.nonce,
    // Transaction type will be determined by useEthTransaction based on network support
  }
}

export const useWithdrawFundsTransactionEth = (
  withdrawTransactionData: ReturnType<typeof useWithdrawTransaction>,
) => {
  const [isLocked, _setIsLocked] = useState(false)
  const { balance, account, tokenId } = useWithdrawWizard()
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

  // Use Yield API transaction data if available, otherwise fallback to standard transfer
  const [tx, error] = useMemo(() => {
    if (
      !isTokenEth(token) ||
      !token.networkId ||
      !token ||
      !account ||
      !isEthereumAddress(account)
    ) {
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

    return [undefined, yieldError]
  }, [account, token, allTransactions, yieldError])

  // Only estimate fees when we have the Yield API transaction data
  const shouldEstimateFees = !isYieldLoading && allTransactions.length > 0
  const result = useEthTransaction(
    // Only pass transaction if Yield API has responded
    shouldEstimateFees ? tx : undefined,
    token?.networkId,
    isLocked,
    false,
  )

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
    isLoading: isYieldLoading || result.isLoading,
    error: error || result.error,
    allTransactions: allTransactions,
  }
}
