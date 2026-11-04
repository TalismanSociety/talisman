import { useQuery } from "@tanstack/react-query"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useNetworks } from "@ui/state/chaindata"
import { useMemo } from "react"
import type { PublicClient } from "viem"
import type { ApprovalInfo, BaseQuote } from "../swap-modules/common.swap-module"
import type { SwapModuleEntry } from "../swaps.api"
import { type MinedApproval, minedBlockOn, readAllowanceStep } from "./erc20Approval"

// an approval sent without waiting for its receipt is only seen once it mines
const ALLOWANCE_RECHECK_MS = 3_000

/** an RPC node behind the approval's block still reports the allowance before it, so it fails the read instead and the query retries */
const blockAtLeast = async (client: PublicClient, minedAt: bigint | undefined) => {
  if (minedAt === undefined) return undefined
  const latest = await client.getBlockNumber({ cacheTime: 0 })
  return latest > minedAt ? latest : minedAt
}

/**
 * The allowance the selected module's spender still needs for the first leg, with the step that grants it.
 * A revoke is read again once it confirms and the `approvalCounter` increments, and the real approval follows.
 * Once an approval mined, the allowance is never read from before its block.
 * Only a successful read tells whether an approval is needed: a failed one keeps it checking and reads again.
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
  minedApproval: MinedApproval | undefined
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

  const approvalMinedAt = approvalInfo
    ? minedBlockOn(params.minedApproval, approvalInfo)
    : undefined

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
      approvalMinedAt?.toString(),
    ],
    queryFn: async () => {
      if (!approvalInfo) return null

      const network = evmNetworks.find((n) => n.id.toString() === approvalInfo.chainId.toString())
      if (!network) return null

      const client = getExtensionPublicClient(network)
      if (!client) return null

      const blockNumber = await blockAtLeast(client, approvalMinedAt)
      const step = await readAllowanceStep(client, approvalInfo, blockNumber)
      return step === "none" ? null : { ...approvalInfo, step }
    },
    enabled: !!approvalInfo,
    refetchInterval: (query) =>
      query.state.status === "error" || (params.approvalCounter > 0 && query.state.data)
        ? ALLOWANCE_RECHECK_MS
        : false,
  })

  const needsRevoke = allowanceQuery.data?.step === "revoke"
  const isChecked = !approvalInfo || allowanceQuery.data !== undefined

  return useMemo(
    () => ({
      data: allowanceQuery.data ?? null,
      loading: !isChecked,
      needsRevoke,
    }),
    [allowanceQuery.data, isChecked, needsRevoke]
  )
}
