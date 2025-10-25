import { BalanceFormatter } from "@talismn/balances"
import { useQuery } from "@tanstack/react-query"
import { YieldDto, yieldSdk } from "extension-core"
import { useCallback, useMemo } from "react"

import {
  useAccountByAddress,
  useBalance,
  useNetworkById,
  useToken,
  useTokenRates,
  useTokens,
} from "@ui/state"

import { useClaimWizard } from "../context/ClaimWizardContext"
import { mapYieldTokenToTokenId } from "../utils/tokenMapping"
import { useClaimFundsTransaction } from "./useClaimFundsTransaction"

interface TClaim {
  // Data
  account: string | undefined
  token: ReturnType<typeof useToken>
  network: ReturnType<typeof useNetworkById>
  product: YieldDto | null
  balance: ReturnType<typeof useBalance> | null
  claimAmount: BalanceFormatter | null
  estimatedFee: BalanceFormatter | null
  feeToken: ReturnType<typeof useToken>

  // Transaction data
  transaction: ReturnType<typeof useClaimFundsTransaction>

  // Validation
  isValid: boolean
  isLoading: boolean
  error: Error | null

  // Actions
  onClaimClick: () => void
}

export const useClaim = (): TClaim => {
  const { account, yieldId, validatorAddress: _validatorAddress, balance } = useClaimWizard()

  // Get account, token, and network data
  const _accountData = useAccountByAddress(account as string)
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

  // Get token from mapped token ID
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)
  const tokenRates = useTokenRates(tokenId)

  // Get user balance for the token
  const userBalance = useBalance(account as string, tokenId)

  // Fetch the selected product directly by ID to avoid filtering issues
  const { data: product } = useQuery({
    queryKey: ["yieldProduct", yieldId],
    queryFn: () => yieldSdk.getYield(yieldId!),
    enabled: !!yieldId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })

  // Get transaction data (similar to SendFunds)
  const transaction: ReturnType<typeof useClaimFundsTransaction> = useClaimFundsTransaction()

  // Calculate claim amount from balance data
  const claimAmount = useMemo(() => {
    if (!token || !tokenRates || !balance) return null

    // For claims, the amount is the claimable amount from the balance
    const claimableAmount = balance.amountRaw || "0"
    return new BalanceFormatter(claimableAmount, token.decimals, tokenRates)
  }, [balance, token, tokenRates])

  // Use transaction's estimated fee if available
  const estimatedFee = useMemo(() => {
    // Use standard transaction fee calculation
    if (transaction && token && tokenRates) {
      // Handle different transaction types
      if ("estimatedFee" in transaction && transaction.estimatedFee) {
        return new BalanceFormatter(transaction.estimatedFee, token.decimals, tokenRates)
      }
      if ("txDetails" in transaction && transaction.txDetails?.estimatedFee) {
        return new BalanceFormatter(transaction.txDetails.estimatedFee, token.decimals, tokenRates)
      }
    }

    return null
  }, [transaction, token, tokenRates])

  // Fee token should be the network's native token
  const feeToken = useToken(network?.nativeTokenId || "")

  // Validation logic
  const isValid = useMemo(() => {
    if (!account || !token || !product || !claimAmount) return false
    if (transaction?.isLoading) return false
    if (transaction?.error) return false

    // Check if transaction has estimated fee (handle different transaction types)
    const hasEstimatedFee =
      transaction &&
      (("estimatedFee" in transaction && transaction.estimatedFee) ||
        ("txDetails" in transaction && transaction.txDetails?.estimatedFee))
    if (!hasEstimatedFee) return false

    return true
  }, [account, token, product, claimAmount, transaction])

  const isLoading = useMemo(() => {
    return transaction?.isLoading || false
  }, [transaction?.isLoading])

  const error = useMemo(() => {
    if (!transaction?.error) return null
    return transaction.error instanceof Error ? transaction.error : new Error(transaction.error)
  }, [transaction?.error])

  const onClaimClick = useCallback(() => {
    // This will be handled by the ClaimAmountForm component
    // The actual claim logic is in ClaimSubmitButton
  }, [])

  return {
    // Data
    account,
    token,
    network,
    product: product || null,
    balance: userBalance,
    claimAmount,
    estimatedFee,
    feeToken,

    // Transaction data
    transaction,

    // Validation
    isValid,
    isLoading,
    error,

    // Actions
    onClaimClick,
  }
}
