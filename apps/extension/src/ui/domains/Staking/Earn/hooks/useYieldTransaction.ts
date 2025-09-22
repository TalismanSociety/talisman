import { planckToTokens } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { TransactionRequest } from "viem"

import { useBalance, useToken } from "@ui/state"

import { useDepositWizard } from "../context/DepositWizardContext"
import { yieldApi, YieldEnterResponse, YieldTransaction } from "../services/yieldApi"

export const useYieldTransaction = () => {
  const { account, tokenId, productId, amount, depositMax } = useDepositWizard()
  const token = useToken(tokenId as string)
  const balance = useBalance(account as string, tokenId as string)

  // Only call Yield.xyz API when we have all required data and user has entered an amount
  const shouldFetch = !!(
    account &&
    tokenId &&
    productId &&
    token &&
    (amount || depositMax) &&
    // Only fetch if user has actually entered an amount (not just opened the form)
    (amount || depositMax)
  )

  const {
    data: yieldResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["yieldTransaction", account, tokenId, productId, amount, depositMax],
    queryFn: async (): Promise<YieldEnterResponse> => {
      if (!account || !productId || (!amount && !depositMax)) {
        throw new Error("Missing required parameters")
      }

      // Check if user has sufficient balance
      if (amount && balance && BigInt(amount) > balance.transferable.planck) {
        throw new Error(
          `Insufficient balance. You have ${planckToTokens(balance.transferable.planck.toString(), token?.decimals || 18)} ${token?.symbol || "tokens"}, but trying to deposit ${planckToTokens(amount, token?.decimals || 18)} ${token?.symbol || "tokens"}.`,
        )
      }

      // For now, use productId as yieldId - in real implementation this would be mapped
      const yieldId = productId

      // Convert amount from planck units (wei) back to decimal format for Yield.xyz API
      let depositAmount = "0"
      if (amount && token) {
        depositAmount = planckToTokens(amount, token.decimals)
      }

      const requestPayload = {
        yieldId,
        address: account,
        arguments: {
          amount: depositAmount,
        },
      }

      return yieldApi.enter(requestPayload)
    },
    enabled: shouldFetch,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 30000, // 30 seconds
  })

  // Get the first pending transaction (most yield products have a single transaction)
  const primaryTransaction = useMemo((): YieldTransaction | null => {
    if (!yieldResponse?.transactions) return null

    // Find the first non-skipped transaction
    const pendingTx = yieldResponse.transactions.find((tx) => tx.status !== "SKIPPED")
    return pendingTx || null
  }, [yieldResponse])

  // Parse the unsigned transaction for use with useEthTransaction
  const parsedTransaction = useMemo((): TransactionRequest | undefined => {
    if (!primaryTransaction?.unsignedTransaction) return undefined

    try {
      // Parse the unsigned transaction JSON string
      const unsignedTx = JSON.parse(primaryTransaction.unsignedTransaction)

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
  }, [primaryTransaction, account])

  // Calculate max amount from Yield.xyz response if available
  const maxAmount = useMemo(() => {
    if (!yieldResponse?.amountRaw) return null
    return yieldResponse.amountRaw
  }, [yieldResponse])

  return {
    // Yield.xyz specific data
    yieldResponse,
    primaryTransaction,
    allTransactions: yieldResponse?.transactions || [],

    // Transaction data for useEthTransaction
    transaction: parsedTransaction,
    maxAmount,

    // Loading and error states
    isLoading,
    error,
    refetch,

    // Helper flags
    hasTransactions: !!yieldResponse?.transactions?.length,
    isMultiStep: (yieldResponse?.transactions?.length || 0) > 1,
  }
}
