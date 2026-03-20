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
 *
 * Some ERC20 tokens (notably USDT on Ethereum mainnet) implement a non-standard `approve()`
 * that reverts when changing a non-zero allowance to a different non-zero value — a safety
 * measure against front-running attacks.
 *
 * When we detect a non-zero but insufficient existing allowance (`needsRevoke`), we first
 * build an `approve(spender, 0)` transaction. After that revoke tx confirms and the
 * `approvalCounter` increments, the allowance re-query finds 0 and we fall through to the
 * normal `approve(spender, amount)` flow automatically.
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

      // Track whether there's a non-zero but insufficient allowance.
      // Some tokens (e.g. USDT) revert on approve() when current allowance is non-zero,
      // requiring a reset to zero first. We surface this to the UI.
      return { ...approvalInfo, existingAllowance: allowance }
    },
    enabled: !!approvalInfo,
  })

  // When there's a non-zero but insufficient allowance, some tokens (e.g. USDT) require
  // resetting to zero before setting a new value. We handle this by first building a revoke
  // tx (approve to 0). After it confirms, the allowance query re-runs, finds 0, and the
  // normal approve flow kicks in automatically.
  // Note: ideally we would check that a normal approve() would revert before forcing the user to go through a revoke first
  const needsRevoke = useMemo(
    () => (allowanceQuery.data?.existingAllowance ?? 0n) > 0n,
    [allowanceQuery.data]
  )

  // Prepare approval tx
  const approveTx = useMemo(() => {
    const approval = allowanceQuery.data
    if (!approval) return null

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [approval.contractAddress as `0x${string}`, needsRevoke ? 0n : approval.amount],
    })

    return {
      chain: null,
      to: approval.tokenAddress as `0x${string}`,
      from: fromAddress as `0x${string}`,
      data,
      value: 0n,
    }
  }, [allowanceQuery.data, fromAddress, needsRevoke])

  return useMemo(
    () => ({
      data: allowanceQuery.data ?? null,
      loading: allowanceQuery.isLoading,
      approveTx,
      needsRevoke,
    }),
    [allowanceQuery.data, allowanceQuery.isLoading, approveTx, needsRevoke]
  )
}
