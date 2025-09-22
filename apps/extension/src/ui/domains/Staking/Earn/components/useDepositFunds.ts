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
    // Prioritize Yield.xyz gas estimate if available
    if (transaction?.yieldTransaction?.gasEstimate && token && tokenRates && network) {
      // eslint-disable-next-line no-console
      console.log("Yield.xyz gasEstimate structure:", transaction.yieldTransaction.gasEstimate)

      // Extract the gas estimate value - it could be a string or an object
      let gasEstimateValue: string
      let feeTokenDecimals: number
      try {
        if (typeof transaction.yieldTransaction.gasEstimate === "string") {
          // Check if it's a JSON string that needs parsing
          if (transaction.yieldTransaction.gasEstimate.startsWith("{")) {
            const parsed = JSON.parse(transaction.yieldTransaction.gasEstimate)
            gasEstimateValue = parsed.amount
            feeTokenDecimals = parsed.token?.decimals || 18
          } else {
            // It's a plain string value
            gasEstimateValue = transaction.yieldTransaction.gasEstimate
            feeTokenDecimals = 18 // Default to ETH decimals
          }
        } else if (
          typeof transaction.yieldTransaction.gasEstimate === "object" &&
          transaction.yieldTransaction.gasEstimate.amount
        ) {
          gasEstimateValue = transaction.yieldTransaction.gasEstimate.amount
          feeTokenDecimals = transaction.yieldTransaction.gasEstimate.token?.decimals || 18
        } else {
          // eslint-disable-next-line no-console
          console.warn("Unexpected gasEstimate format:", transaction.yieldTransaction.gasEstimate)
          gasEstimateValue = "0"
          feeTokenDecimals = 18
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to parse gasEstimate:", error)
        gasEstimateValue = "0"
        feeTokenDecimals = 18
      }

      // Convert from decimal string to planck (wei) units
      // Use the fee token decimals from Yield.xyz response or fallback to network native token
      const gasEstimatePlanck = BigInt(
        Math.floor(parseFloat(gasEstimateValue) * Math.pow(10, feeTokenDecimals)),
      )
      // eslint-disable-next-line no-console
      console.log("Using Yield.xyz gas estimate:", {
        gasEstimateValue,
        gasEstimatePlanck: gasEstimatePlanck.toString(),
        feeTokenDecimals,
        depositTokenDecimals: token.decimals,
        networkId: network.id,
      })
      // Use fee token decimals for the actual value, but display with deposit token decimals
      return new BalanceFormatter(gasEstimatePlanck, feeTokenDecimals, tokenRates)
    }

    // Fallback to useEthTransaction estimated fee
    if (transaction?.estimatedFee && token && tokenRates) {
      return new BalanceFormatter(transaction.estimatedFee, token.decimals, tokenRates)
    }

    return null
  }, [
    transaction?.estimatedFee,
    transaction?.yieldTransaction?.gasEstimate,
    token,
    tokenRates,
    network,
  ])

  // Fee token should be the network's native token (ETH), not the deposit token
  const feeToken = useToken(network?.nativeTokenId)

  // Use transaction loading state
  const isLoading = transaction?.isLoading || false
  const error = transaction?.error || null
  const isEstimatingMaxAmount = depositMax && !transaction?.maxAmount

  // Validation with YieldProduct constraints
  const validationErrors = useMemo(() => {
    const errors: string[] = []

    // Only show basic validations if user has started interacting
    const hasUserInput = amount || depositMax

    // Basic validations (only show if user has started entering data)
    if (hasUserInput) {
      if (!account) errors.push("Account required")
      if (!tokenId) errors.push("Token required")
      if (!productId) errors.push("Product required")
      if (!amount && !depositMax) errors.push("Amount required")
    }

    // Product status validations
    if (product) {
      if (!product.status.enter) {
        errors.push("Deposits are currently disabled for this product")
      }
      if (product.metadata.underMaintenance) {
        errors.push("Product is under maintenance")
      }
      if (product.metadata.deprecated) {
        errors.push("This product is deprecated")
      }
    }

    // Amount validations
    if (deposit && product) {
      const minAmount = BigInt(product.mechanics.entryLimits.minimum)
      const maxAmount = product.mechanics.entryLimits.maximum
        ? BigInt(product.mechanics.entryLimits.maximum)
        : null

      if (deposit.planck < minAmount) {
        errors.push(`Minimum deposit: ${product.mechanics.entryLimits.minimum} ${token?.symbol}`)
      }

      if (maxAmount && deposit.planck > maxAmount) {
        errors.push(`Maximum deposit: ${product.mechanics.entryLimits.maximum} ${token?.symbol}`)
      }
    }

    // Balance validation
    if (deposit && balance && deposit.planck > balance.transferable.planck) {
      errors.push("Insufficient balance")
    }

    return errors
  }, [account, tokenId, productId, amount, depositMax, deposit, balance, product, token])

  const isValid = useMemo(() => {
    return validationErrors.length === 0
  }, [validationErrors])

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
    validationErrors,
    isEstimatingMaxAmount,
    depositMax,
    amount,

    // Actions
    onDepositMaxClick,
  }
}
