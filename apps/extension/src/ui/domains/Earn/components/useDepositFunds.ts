import { BalanceFormatter } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { YieldDto } from "extension-core"
import { useMemo } from "react"

import { useAccountByAddress, useBalance, useNetworkById, useToken, useTokenRates } from "@ui/state"
import { useYieldProducts } from "@ui/state/yield"

import { useDepositWizard } from "../context/DepositWizardContext"
import { useDepositValidation } from "../hooks/useDepositValidation"
import { mapNetworkToYieldNetwork } from "../utils/networkMapping"
import { useDepositFundsTransaction } from "./useDepositFundsTransaction"

interface TDepositFunds {
  // Data
  account: ReturnType<typeof useAccountByAddress>
  token: ReturnType<typeof useToken>
  tokenId: string | undefined
  network: ReturnType<typeof useNetworkById>
  product: YieldDto | null
  balance: ReturnType<typeof useBalance>
  tokenRates: ReturnType<typeof useTokenRates>

  // Calculated values
  deposit: BalanceFormatter | null
  maxAmount: BalanceFormatter | null
  estimatedFee: BalanceFormatter | null
  feeToken: ReturnType<typeof useToken>
  feeTokenRates: ReturnType<typeof useTokenRates>

  // Transaction data
  transaction: ReturnType<typeof useDepositFundsTransaction>

  // State
  isLoading: boolean
  error: string | Error | null
  isValid: boolean
  validationErrors: string[]
  isEstimatingMaxAmount: boolean
  depositMax: boolean
  amount: string | undefined

  // Actions
  onDepositMaxClick: () => void
}

export const useDepositFunds = (): TDepositFunds => {
  const { account, tokenId, productId, amount, depositMax, set, remove } = useDepositWizard()

  // Get account, token, and network data
  const accountData = useAccountByAddress(account as string)
  const token = useToken(tokenId as TokenId)
  const network = useNetworkById(token?.networkId)
  const tokenRates = useTokenRates(tokenId as TokenId)

  // Get balance for the account and token
  const balance = useBalance(account as string, tokenId as string)

  // Get the mapped network name
  const mappedNetworkName = mapNetworkToYieldNetwork(network)

  // Get yield products to find the selected product
  const { data: yieldProducts = [] } = useYieldProducts({
    inputToken: token?.symbol,
    network: mappedNetworkName || undefined,
  })

  const product = useMemo(() => {
    return yieldProducts.find((p) => p.id === productId) || null
  }, [yieldProducts, productId])

  // Get transaction data (similar to SendFunds)
  const transaction: ReturnType<typeof useDepositFundsTransaction> = useDepositFundsTransaction()

  // Calculate deposit amount
  const deposit = useMemo(() => {
    if (!token || !tokenRates) return null
    if (amount) return new BalanceFormatter(amount, token.decimals, tokenRates)
    return null
  }, [amount, token, tokenRates])

  // Use transaction's max amount if available, otherwise calculate from balance
  const maxAmount: BalanceFormatter | null = useMemo(() => {
    if (transaction?.maxAmount) {
      return new BalanceFormatter(transaction.maxAmount, token?.decimals || 18, tokenRates)
    }
    if (!token || !tokenRates || !balance) return null
    return new BalanceFormatter(balance.transferable.planck, token.decimals, tokenRates)
  }, [transaction?.maxAmount, token, tokenRates, balance])

  // Use transaction's estimated fee if available
  const estimatedFee = useMemo(() => {
    // Prioritize Yield.xyz gas estimate if available
    if (
      transaction?.yieldTransaction &&
      "gasEstimate" in transaction.yieldTransaction &&
      transaction.yieldTransaction.gasEstimate &&
      token &&
      tokenRates &&
      network
    ) {
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
          transaction.yieldTransaction.gasEstimate &&
          "amount" in transaction.yieldTransaction.gasEstimate
        ) {
          const gasEstimate = transaction.yieldTransaction.gasEstimate as {
            amount: string
            token?: { decimals: number }
          }
          gasEstimateValue = gasEstimate.amount
          feeTokenDecimals = gasEstimate.token?.decimals || 18
        } else {
          gasEstimateValue = "0"
          feeTokenDecimals = 18
        }
      } catch (error) {
        gasEstimateValue = "0"
        feeTokenDecimals = 18
      }

      // Convert from decimal string to planck (wei) units
      // Use the fee token decimals from Yield.xyz response or fallback to network native token
      const gasEstimatePlanck = BigInt(
        Math.floor(parseFloat(gasEstimateValue) * Math.pow(10, feeTokenDecimals)),
      )
      // Use fee token decimals for the actual value, but display with deposit token decimals
      return new BalanceFormatter(gasEstimatePlanck, feeTokenDecimals, tokenRates)
    }

    // Fallback to useEthTransaction estimated fee
    if (transaction?.estimatedFee && token && tokenRates) {
      return new BalanceFormatter(transaction.estimatedFee, token.decimals, tokenRates)
    }

    return null
  }, [transaction?.estimatedFee, transaction?.yieldTransaction, token, tokenRates, network])

  // Fee token should be the network's native token (ETH), not the deposit token
  const feeToken = useToken(network?.nativeTokenId)

  // Use transaction loading state
  const isLoading = transaction?.isLoading || false
  const error = transaction?.error || null
  const isEstimatingMaxAmount = depositMax && !transaction?.maxAmount

  // Use the validation hook
  const { isValid, validationErrors } = useDepositValidation(product)

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
