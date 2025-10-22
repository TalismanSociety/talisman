import type { ActionDto, TransactionDto } from "extension-core"
import { planckToTokens } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { TransactionRequest } from "viem"

import { useBalance, useNetworkById, useToken } from "@ui/state"
import { useYieldProducts } from "@ui/state/yield"

import { useDepositWizard } from "../context/DepositWizardContext"
import { yieldApi } from "../services/yieldApi"
import { mapNetworkToYieldNetwork } from "../utils/networkMapping"
import { getTokenAddress } from "../utils/tokenUtils"
import { useDepositValidation } from "./useDepositValidation"

export const useYieldTransaction = () => {
  const { account, tokenId, productId, amount, depositMax, validatorAddress } = useDepositWizard()
  const token = useToken(tokenId as string)
  const balance = useBalance(account as string, tokenId as string)
  const network = useNetworkById(token?.networkId)

  // Get the mapped network name
  const mappedNetworkName = mapNetworkToYieldNetwork(network)

  // Get token address if available, fallback to symbol
  const tokenIdentifier = useMemo(() => {
    const address = getTokenAddress(token)
    return address || token?.symbol || ""
  }, [token])

  // Get yield products to find the selected product
  const { data: yieldProducts = [] } = useYieldProducts({
    inputToken: tokenIdentifier,
    network: mappedNetworkName || undefined,
  })

  const product = useMemo(() => {
    return yieldProducts.find((p) => p.id === productId) || null
  }, [yieldProducts, productId])

  // Get validation state
  const { isValid } = useDepositValidation(product)

  // Only call Yield.xyz API when we have all required data, user has entered an amount > 0, and validations pass
  const shouldFetch = !!(
    account &&
    tokenId &&
    productId &&
    token &&
    (amount || depositMax) &&
    // Only fetch if user has actually entered an amount greater than zero
    (amount
      ? BigInt(
          typeof amount === "string" ? amount : (amount as { amount?: string })?.amount || "0",
        ) > 0n
      : depositMax) &&
    // Only fetch if all validations pass
    isValid
  )

  const {
    data: yieldResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["yieldTransaction", account, tokenId, productId, amount, depositMax],
    queryFn: async (): Promise<ActionDto> => {
      if (!account || !productId || (!amount && !depositMax)) {
        throw new Error("Missing required parameters")
      }

      // Check if user has sufficient balance
      if (amount && balance) {
        const amountString =
          typeof amount === "string" ? amount : (amount as { amount?: string })?.amount || "0"
        if (BigInt(amountString) > balance.transferable.planck) {
          throw new Error(
            `Insufficient balance. You have ${planckToTokens(balance.transferable.planck.toString(), token?.decimals || 18)} ${token?.symbol || "tokens"}, but trying to deposit ${planckToTokens(amountString, token?.decimals || 18)} ${token?.symbol || "tokens"}.`,
          )
        }
      }

      // For now, use productId as yieldId - in real implementation this would be mapped
      const yieldId = productId

      // Convert amount from planck units (wei) back to decimal format for Yield.xyz API
      let depositAmount = "0"
      if (amount && token) {
        const amountString =
          typeof amount === "string" ? amount : (amount as { amount?: string })?.amount || "0"
        depositAmount = planckToTokens(amountString, token.decimals)
      }

      // Build arguments based on product requirements
      const arguments_: {
        amount: string
        [key: string]: string | number | boolean | string[] | undefined
      } = {
        amount: depositAmount,
      }

      // For products that require validator selection, include validatorAddress
      if (product?.mechanics?.requiresValidatorSelection) {
        arguments_.validatorAddress = validatorAddress
      }

      const requestPayload = {
        yieldId,
        address: account,
        arguments: arguments_,
      }

      return yieldApi.enter(requestPayload)
    },
    enabled: shouldFetch,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 30000, // 30 seconds
  })

  // Get all non-skipped transactions for sequential execution
  const allTransactions = useMemo((): TransactionDto[] => {
    if (!yieldResponse?.transactions) return []

    // Return all non-skipped transactions in order
    return yieldResponse.transactions.filter((tx) => tx.status !== "SKIPPED")
  }, [yieldResponse])

  // Parse the first unsigned transaction for use with useEthTransaction (for gas estimation)
  const parsedTransaction = useMemo((): TransactionRequest | undefined => {
    const firstTransaction = allTransactions[0]
    if (!firstTransaction?.unsignedTransaction) return undefined

    try {
      // Parse the unsigned transaction JSON string
      const unsignedTx =
        typeof firstTransaction?.unsignedTransaction === "string"
          ? JSON.parse(firstTransaction?.unsignedTransaction)
          : firstTransaction?.unsignedTransaction

      // Validate required fields
      if (!unsignedTx.to || !unsignedTx.data) {
        return undefined
      }

      // Validate that to address is a valid Ethereum address
      if (!unsignedTx.to.startsWith("0x") || unsignedTx.to.length !== 42) {
        return undefined
      }

      // Validate that data is a valid hex string
      if (!unsignedTx.data.startsWith("0x")) {
        return undefined
      }

      // Convert to the format expected by useEthTransaction
      const baseTx: TransactionRequest = {
        to: unsignedTx.to as `0x${string}`,
        value: BigInt(unsignedTx.value || "0"),
        data: unsignedTx.data as `0x${string}`,
        from: account as `0x${string}`,
        gas: unsignedTx.gas ? BigInt(unsignedTx.gas) : undefined,
        nonce: unsignedTx.nonce,
      }

      // Handle EIP-1559 vs legacy gas pricing
      if (unsignedTx.maxFeePerGas && unsignedTx.maxPriorityFeePerGas) {
        return {
          ...baseTx,
          type: "eip1559" as const,
          maxFeePerGas: BigInt(unsignedTx.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(unsignedTx.maxPriorityFeePerGas),
        } as TransactionRequest
      } else if (unsignedTx.gasPrice) {
        return {
          ...baseTx,
          type: "legacy" as const,
          gasPrice: BigInt(unsignedTx.gasPrice),
        } as TransactionRequest
      }

      return baseTx
    } catch (error) {
      return undefined
    }
  }, [allTransactions, account])

  // Calculate max amount from Yield.xyz response if available
  const maxAmount = useMemo(() => {
    if (!yieldResponse?.amountRaw) return null
    return yieldResponse.amountRaw
  }, [yieldResponse])

  return {
    // Yield.xyz specific data
    yieldResponse,
    allTransactions: yieldResponse?.transactions || [],
    nonSkippedTransactions: allTransactions, // New: filtered transactions for execution

    // Transaction data for useEthTransaction
    transaction: parsedTransaction,
    maxAmount,

    // Loading and error states
    isLoading,
    error,
    refetch,

    // Helper flags
    hasTransactions: !!yieldResponse?.transactions?.length,
    isMultiStep: allTransactions.length > 1,
    transactionCount: allTransactions.length,
  }
}
