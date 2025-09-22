import { BalanceFormatter } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useAccountByAddress, useBalance, useNetworkById, useToken, useTokenRates } from "@ui/state"
import { useYieldProducts } from "@ui/state/yield"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useDepositFundsTransaction } from "./useDepositFundsTransaction"

export const useDepositFunds = () => {
  const { account, tokenId, productId, amount, depositMax, set, remove } = useDepositWizard()

  // Get account, token, and network data
  const accountData = useAccountByAddress(account as string)
  const token = useToken(tokenId as TokenId)
  const network = useNetworkById(token?.networkId)
  const tokenRates = useTokenRates(tokenId as TokenId)

  // Get balance for the account and token
  const balance = useBalance(account as string, tokenId as string)

  // Get yield products to find the selected product
  const { data: yieldProducts = [] } = useYieldProducts({
    tokenId: tokenId as TokenId,
    tokenSymbol: token?.symbol,
    networkName: network?.platform,
  })

  const product = useMemo(() => {
    return yieldProducts.find((p) => p.id === productId) || null
  }, [yieldProducts, productId])

  // Get transaction data (similar to SendFunds)
  const transaction = useDepositFundsTransaction()

  // Calculate deposit amount
  const deposit = useMemo(() => {
    if (!token || !tokenRates) return null
    if (amount) return new BalanceFormatter(amount, token.decimals, tokenRates)
    return null
  }, [amount, token, tokenRates])

  // Use transaction's max amount if available, otherwise calculate from balance
  const maxAmount = useMemo(() => {
    if (transaction?.maxAmount) {
      return new BalanceFormatter(transaction.maxAmount, token?.decimals || 18, tokenRates)
    }
    if (!token || !tokenRates || !balance) return null
    return new BalanceFormatter(balance.transferable.planck, token.decimals, tokenRates)
  }, [transaction?.maxAmount, token, tokenRates, balance])

  // Use transaction's estimated fee if available
  const estimatedFee = useMemo(() => {
    if (transaction?.estimatedFee && token && tokenRates) {
      return new BalanceFormatter(transaction.estimatedFee, token.decimals, tokenRates)
    }
    if (!token || !tokenRates) return null
    // Fallback mock fee: 0.01 tokens
    const feePlanck = BigInt(Math.floor(0.01 * Math.pow(10, token.decimals)))
    return new BalanceFormatter(feePlanck, token.decimals, tokenRates)
  }, [transaction?.estimatedFee, token, tokenRates])

  const feeToken = token // For simplicity, fee is paid in the same token

  // Use transaction loading state
  const isLoading = transaction?.isLoading || false
  const error = transaction?.error || null
  const isEstimatingMaxAmount = depositMax && !transaction?.maxAmount

  // Validation
  const isValid = useMemo(() => {
    if (!account || !tokenId || !productId) return false
    if (!amount && !depositMax) return false
    if (deposit && balance && deposit.planck > balance.transferable.planck) return false
    return true
  }, [account, tokenId, productId, amount, depositMax, deposit, balance])

  // Actions
  const onDepositMaxClick = () => {
    if (maxAmount) {
      // Set depositMax flag and clear amount
      set("depositMax", true)
      remove("amount")
    }
  }

  return {
    // Data
    account: accountData,
    token,
    tokenId,
    network,
    product,
    balance,
    tokenRates,

    // Calculated values
    deposit,
    maxAmount,
    estimatedFee,
    feeToken,
    feeTokenRates: tokenRates, // For simplicity, fee is paid in same token

    // Transaction data (similar to SendFunds)
    transaction,

    // State
    isLoading,
    error,
    isValid,
    isEstimatingMaxAmount,
    depositMax,
    amount,

    // Actions
    onDepositMaxClick,
  }
}
