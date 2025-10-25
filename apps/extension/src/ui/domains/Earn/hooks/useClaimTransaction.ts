import type { ActionDto, TransactionDto } from "extension-core"
import { useQuery } from "@tanstack/react-query"
import { yieldSdk } from "extension-core"
import { useMemo } from "react"
import { TransactionRequest } from "viem"

import { useBalance, useNetworkById, useToken } from "@ui/state"

import { useClaimWizard } from "../context/ClaimWizardContext"
import { yieldApi } from "../services/yieldApi"

export const useClaimTransaction = () => {
  const { account, yieldId, validatorAddress: _validatorAddress, balance } = useClaimWizard()
  const token = useToken("") // We'll get token from balance data
  const _balance = useBalance(account as string, "")
  const _network = useNetworkById(token?.networkId)

  // Fetch the selected product directly by ID to avoid filtering issues
  const { data: product } = useQuery({
    queryKey: ["yieldProduct", yieldId],
    queryFn: () => yieldSdk.getYield(yieldId!),
    enabled: !!yieldId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })

  // Only call Yield.xyz API when we have all required data
  const shouldFetch = !!(account && yieldId && product && balance)

  const {
    data: yieldResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["claimTransaction", account, yieldId, balance?.address],
    queryFn: async (): Promise<ActionDto> => {
      if (!account || !yieldId || !product) {
        throw new Error("Missing required parameters")
      }

      // Find the claim action from the balance's pendingActions
      if (!balance?.pendingActions) {
        throw new Error("No pending actions found in balance")
      }

      const claimAction = balance.pendingActions.find((action) => action.type === "CLAIM_REWARDS")
      if (!claimAction) {
        throw new Error("No CLAIM_REWARDS action found in pendingActions")
      }

      const requestPayload = {
        yieldId,
        address: account,
        action: claimAction.type as "CLAIM_REWARDS",
        passthrough: claimAction.passthrough,
        arguments: {},
      }

      return yieldApi.manage(requestPayload)
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
