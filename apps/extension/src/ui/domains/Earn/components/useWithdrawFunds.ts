import { BalanceFormatter } from "@talismn/balances"
import { useQuery } from "@tanstack/react-query"
import { YieldDto, yieldSdk } from "extension-core"
import { useCallback, useMemo } from "react"

import { useAccountByAddress, useBalance, useNetworkById, useToken, useTokenRates } from "@ui/state"

import { useWithdrawWizard } from "../context/WithdrawWizardContext"
import { useWithdrawFundsTransaction } from "./useWithdrawFundsTransaction"

interface TWithdrawFunds {
  // Data
  account: string | undefined
  token: ReturnType<typeof useToken>
  network: ReturnType<typeof useNetworkById>
  product: YieldDto | null
  balance: ReturnType<typeof useBalance> | null
  withdrawAmount: BalanceFormatter | null
  estimatedFee: BalanceFormatter | null
  feeToken: ReturnType<typeof useToken>
  maxAmount: BalanceFormatter | null
  tokenRates: ReturnType<typeof useTokenRates>
  tokenId: string | undefined
  isEstimatingMaxAmount: boolean
  withdrawMax: boolean
  amount: string | undefined

  // Transaction data
  transaction: ReturnType<typeof useWithdrawFundsTransaction>

  // Validation
  isValid: boolean
  isLoading: boolean
  error: Error | null

  // Actions
  onWithdrawMaxClick: () => void
}

export const useWithdrawFunds = (): TWithdrawFunds => {
  const {
    account,
    yieldId,
    tokenId,
    amount,
    validatorAddress: _validatorAddress,
    withdrawMax,
    balance: wizardBalance,
  } = useWithdrawWizard()

  // Get account, token, and network data
  const _accountData = useAccountByAddress(account as string)

  // Get token from mapped token ID
  const token = useToken(tokenId as string)
  const network = useNetworkById(token?.networkId)
  const tokenRates = useTokenRates(tokenId as string)

  // Get user balance for the token
  const userBalance = useBalance(account as string, tokenId as string)

  // Check if token mapping failed
  // If we have balance data but no token (mapping failed), show error
  const tokenMappingError = useMemo(() => {
    // If we have balance data (meaning we're trying to withdraw) but no token, mapping failed
    if (wizardBalance && !token) {
      return new Error("Withdraw not supported for this token")
    }
    return null
  }, [wizardBalance, token])

  // Fetch the selected product directly by ID to avoid filtering issues
  const { data: product } = useQuery({
    queryKey: ["yieldProduct", yieldId],
    queryFn: () => yieldSdk.getYield(yieldId!),
    enabled: !!yieldId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })

  // Get transaction data (similar to SendFunds)
  const transaction: ReturnType<typeof useWithdrawFundsTransaction> = useWithdrawFundsTransaction()

  // Calculate withdraw amount from balance data
  const withdrawAmount = useMemo(() => {
    if (!token || !tokenRates || !amount) return null

    // For withdraws, the amount is the user-specified amount
    return new BalanceFormatter(amount, token.decimals, tokenRates)
  }, [amount, token, tokenRates])

  // Use transaction's estimated fee if available
  const estimatedFee = useMemo(() => {
    // Use standard transaction fee calculation
    if (transaction && token && tokenRates) {
      const tx = transaction as {
        estimatedFee?: string | bigint
        txDetails?: { estimatedFee?: string | bigint }
      }

      // Handle different transaction types
      if ("estimatedFee" in tx && tx.estimatedFee) {
        return new BalanceFormatter(tx.estimatedFee, token.decimals, tokenRates)
      }
      if ("txDetails" in tx && tx.txDetails?.estimatedFee) {
        return new BalanceFormatter(tx.txDetails.estimatedFee, token.decimals, tokenRates)
      }
    }

    return null
  }, [transaction, token, tokenRates])

  // Fee token should be the network's native token
  const feeToken = useToken(network?.nativeTokenId || "")

  // Calculate max amount from balance
  const maxAmount: BalanceFormatter | null = useMemo(() => {
    if (!token || !tokenRates || !userBalance) return null
    return new BalanceFormatter(userBalance.transferable.planck, token.decimals, tokenRates)
  }, [token, tokenRates, userBalance])

  // Check if we're estimating max amount
  const isEstimatingMaxAmount = withdrawMax && !maxAmount

  // Validation logic
  const isValid = useMemo(() => {
    // If token mapping failed, form is invalid
    if (tokenMappingError) return false
    if (!account || !token || !product || !withdrawAmount) return false
    if (transaction?.isLoading) return false
    if (transaction?.error) return false

    // Check if transaction has estimated fee (handle different transaction types)
    const tx = transaction as { estimatedFee?: unknown; txDetails?: { estimatedFee?: unknown } }
    const hasEstimatedFee =
      transaction &&
      (("estimatedFee" in tx && tx.estimatedFee) ||
        ("txDetails" in tx && tx.txDetails?.estimatedFee))
    if (!hasEstimatedFee) return false

    return true
  }, [tokenMappingError, account, token, product, withdrawAmount, transaction])

  const isLoading = useMemo(() => {
    return transaction?.isLoading || false
  }, [transaction?.isLoading])

  const error = useMemo(() => {
    // Prioritize token mapping error
    if (tokenMappingError) return tokenMappingError

    if (!transaction?.error) return null

    // If it's already an Error, return it
    if (transaction.error instanceof Error) return transaction.error

    // If it's a string, create an Error with that message
    if (typeof transaction.error === "string") return new Error(transaction.error)

    // If it's an object with a message property, extract the message
    if (
      transaction.error &&
      typeof transaction.error === "object" &&
      "message" in transaction.error
    ) {
      const errorMessage = String((transaction.error as Error).message)
      return new Error(errorMessage || "An error occurred")
    }

    // Try to stringify if it's an object, or use a default message
    try {
      const errorMessage =
        typeof transaction.error === "object"
          ? JSON.stringify(transaction.error)
          : String(transaction.error)
      return new Error(errorMessage || "An error occurred")
    } catch {
      return new Error("An error occurred")
    }
  }, [tokenMappingError, transaction?.error])

  const onWithdrawMaxClick = useCallback(() => {
    // This will be handled by the WithdrawAmountForm component
    // The actual withdraw logic is in WithdrawSubmitButton
  }, [])

  return {
    // Data
    account,
    token,
    network,
    product: product || null,
    balance: userBalance,
    withdrawAmount,
    estimatedFee,
    feeToken,
    maxAmount,
    tokenRates,
    tokenId,
    isEstimatingMaxAmount,
    withdrawMax,
    amount,

    // Transaction data
    transaction,

    // Validation
    isValid,
    isLoading,
    error,

    // Actions
    onWithdrawMaxClick,
  }
}
