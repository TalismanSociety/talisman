import type { ApprovalInfo, BaseQuote } from "@core/domains/swaps/types"
import { useQuery } from "@tanstack/react-query"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useNetworks } from "@ui/state/chaindata"
import { useMemo } from "react"
import type { SwapModuleEntry } from "../swaps.api"
import { readAllowanceStep } from "./erc20Approval"

// an RPC node behind the approval block still reports the previous allowance
const ALLOWANCE_RECHECK_MS = 3_000

/**
 * The allowance the selected module's spender still needs for the first leg, with the step that grants it.
 * A revoke is read again once it confirms and the `approvalCounter` increments, and the real approval follows.
 */
export const useSwapErc20Approval = (params: {
  selectedModule: SwapModuleEntry | undefined
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

      const step = await readAllowanceStep(client, approvalInfo)
      return step === "none" ? null : { ...approvalInfo, step }
    },
    enabled: !!approvalInfo,
    refetchInterval: (query) =>
      params.approvalCounter > 0 && query.state.data ? ALLOWANCE_RECHECK_MS : false,
  })

  const needsRevoke = allowanceQuery.data?.step === "revoke"

  return useMemo(
    () => ({
      data: allowanceQuery.data ?? null,
      loading: allowanceQuery.isLoading,
      needsRevoke,
    }),
    [allowanceQuery.data, allowanceQuery.isLoading, needsRevoke]
  )
}
