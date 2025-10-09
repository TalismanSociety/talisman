import { isTokenEth } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { getEthTransferTransactionBase } from "extension-core"
import { useMemo, useState } from "react"

import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useBalance, useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useYieldTransaction } from "../hooks/useYieldTransaction"

export const useDepositFundsTransactionEth = () => {
  const [isLocked, setIsLocked] = useState(false)
  const { account, tokenId, amount } = useDepositWizard()
  const token = useToken(tokenId)
  const balance = useBalance(account as string, tokenId as string)

  // Get Yield API transaction data for the actual transaction
  const {
    allTransactions,
    maxAmount: yieldMaxAmount,
    isLoading: isYieldLoading,
    error: yieldError,
  } = useYieldTransaction()

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

    // Fallback to standard transfer (this shouldn't happen for yield operations)
    try {
      return [
        getEthTransferTransactionBase(
          token.networkId,
          account,
          account,
          token,
          BigInt(amount || "0"),
        ),
        yieldError,
      ]
    } catch (err) {
      return [undefined, err as Error]
    }
  }, [account, token, amount, allTransactions, yieldError])

  // Only estimate fees when we have the Yield API transaction data
  const shouldEstimateFees = !isYieldLoading && allTransactions.length > 0
  const result = useEthTransaction(
    // Only pass transaction if Yield API has responded
    shouldEstimateFees ? tx : undefined,
    token?.networkId,
    isLocked,
    false,
  )

  const maxAmount = useMemo(() => {
    // Use Yield API max amount if available
    if (yieldMaxAmount) {
      return yieldMaxAmount
    }

    if (!balance || !isTokenEth(token) || !result.txDetails?.maxFee) return null

    // For deposits, max amount is balance minus max fee
    const val = balance.transferable.planck - result.txDetails.maxFee
    return String(val > 0n ? val : 0n)
  }, [yieldMaxAmount, balance, token, result.txDetails?.maxFee])

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
