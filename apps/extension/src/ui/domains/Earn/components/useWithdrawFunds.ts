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
  } = useWithdrawWizard()

  // Get account, token, and network data
  const _accountData = useAccountByAddress(account as string)

  // Get token from mapped token ID
  const token = useToken(tokenId as string)
  const network = useNetworkById(token?.networkId)
  const tokenRates = useTokenRates(tokenId as string)

  // Get user balance for the token
  const userBalance = useBalance(account as string, tokenId as string)

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
  }, [account, token, product, withdrawAmount, transaction])

  const isLoading = useMemo(() => {
    return transaction?.isLoading || false
  }, [transaction?.isLoading])

  const error = useMemo(() => {
    if (!transaction?.error) return null
    return transaction.error instanceof Error ? transaction.error : new Error(transaction.error)
  }, [transaction?.error])

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
