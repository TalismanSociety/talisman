import { useQuery } from "@tanstack/react-query"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useNetworks } from "@ui/state/chaindata"
import { useMemo } from "react"
import { encodeFunctionData, erc20Abi } from "viem"

import type { ApprovalInfo, BaseQuote } from "../swap-modules/common.swap-module"
import type { swapModules } from "../swaps.api"

/**
 * Manages ERC20 approval state for the selected swap module.
 * Returns approval data (if approval is needed), loading state, and the prepared approval tx.
 */
export const useSwapErc20Approval = (params: {
  selectedModule: (typeof swapModules)[number] | undefined
  fromTokenId: string | null
  toTokenId: string | null
  fromAmount: bigint | null
  fromAddress: string | null
  toAddress: string | null
  selectedSubProtocol: string | undefined
  selectedQuote: BaseQuote | null
  approvalCounter: number
}) => {
  const {
    selectedModule,
    fromTokenId,
    toTokenId,
    fromAmount,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    selectedQuote,
  } = params

  const evmNetworks = useNetworks({ platform: "ethereum" })

  // Get approval info from module (synchronous)
  const approvalInfo: ApprovalInfo = useMemo(() => {
    if (!selectedModule?.getApprovalInfo) return null
    if (!fromTokenId || !toTokenId) return null
    if (!selectedQuote) return null

    return selectedModule.getApprovalInfo({
      fromTokenId,
      toTokenId,
      fromAmount,
      fromAddress,
      toAddress,
      selectedSubProtocol,
      quoteData: selectedQuote,
    })
  }, [
    selectedModule,
    fromTokenId,
    toTokenId,
    fromAmount,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    selectedQuote,
  ])

  // Check on-chain allowance and determine if approval is needed
  const allowanceQuery = useQuery({
    queryKey: [
      "swap-erc20-allowance",
      approvalInfo?.tokenAddress,
      approvalInfo?.fromAddress,
      approvalInfo?.contractAddress,
      approvalInfo?.chainId,
      approvalInfo?.amount?.toString(),
      params.approvalCounter,
    ],
    queryFn: async () => {
      if (!approvalInfo) return null

      const network = evmNetworks.find((n) => n.id.toString() === approvalInfo.chainId.toString())
      if (!network) return null

      const client = getExtensionPublicClient(network)
      if (!client) return null

      const allowance = await client.readContract({
        abi: erc20Abi,
        address: approvalInfo.tokenAddress as `0x${string}`,
        functionName: "allowance",
        args: [
          approvalInfo.fromAddress as `0x${string}`,
          approvalInfo.contractAddress as `0x${string}`,
        ],
      })

      if (allowance >= approvalInfo.amount) return null
      return { ...approvalInfo }
    },
    enabled: !!approvalInfo,
  })

  // Prepare approval tx
  const approveTx = useMemo(() => {
    const approval = allowanceQuery.data
    if (!approval) return null

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [approval.contractAddress as `0x${string}`, approval.amount],
    })

    return {
      chain: null,
      to: approval.tokenAddress as `0x${string}`,
      from: fromAddress as `0x${string}`,
      data,
      value: 0n,
    }
  }, [allowanceQuery.data, fromAddress])

  return useMemo(
    () => ({
      data: allowanceQuery.data ?? null,
      loading: allowanceQuery.isLoading,
      approveTx,
    }),
    [allowanceQuery.data, allowanceQuery.isLoading, approveTx]
  )
}
