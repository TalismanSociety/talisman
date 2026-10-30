import type { ApprovalInfo, QuoteLeg } from "@core/domains/swaps/types"
import { networkIdFromTokenId } from "@talismn/chaindata-provider"
import { skipToken, type UseQueryResult, useQueries } from "@tanstack/react-query"

import type { SwapModule } from "../swap-modules/common.swap-module"
import { getEvmPublicClient } from "../swap-modules/evm-network"
import { swapModules } from "../swaps.api"
import { readAllowanceStep } from "./erc20Approval"

export const legApproval = (module: SwapModule, leg: QuoteLeg): ApprovalInfo => {
  if (!leg.signer) return null
  return (
    module.getApprovalInfo?.({
      fromTokenId: leg.fromTokenId,
      toTokenId: leg.toTokenId,
      fromAmount: leg.inputAmount,
      fromAddress: leg.signer,
      toAddress: leg.recipient,
      quoteData: { legs: [leg] },
    }) ?? null
  )
}

const approvalOf = (leg: QuoteLeg) => {
  const module = swapModules.find((candidate) => candidate.protocol === leg.protocol)
  return module ? legApproval(module, leg) : null
}

const isAllowanceShort = async (leg: QuoteLeg, approval: NonNullable<ApprovalInfo>) => {
  const client = await getEvmPublicClient(networkIdFromTokenId(leg.fromTokenId))
  return (await readAllowanceStep(client, approval)) !== "none"
}

export type LegApprovalCheck = { leg: QuoteLeg; enabled: boolean }

const neededLegs = (results: UseQueryResult<boolean>[]): ReadonlySet<number> =>
  new Set(results.flatMap(({ data }, index) => (data ? [index] : [])))

/**
 * The legs after the first whose spender allowance was short when read.
 * A disabled check keeps what it last read, so a leg that moved on still shows the approval it needed.
 * A screen that opens reads it again: an allowance granted since then needs no card.
 */
export const useLaterLegApprovals = (checks: readonly LegApprovalCheck[]) =>
  useQueries({
    queries: checks.map(({ leg, enabled }, index) => {
      const approval = index > 0 ? approvalOf(leg) : null
      return {
        queryKey: [
          "swap-leg-approval",
          leg.fromTokenId,
          approval?.fromAddress,
          approval?.contractAddress,
          approval?.amount.toString(),
        ],
        queryFn: approval && enabled ? () => isAllowanceShort(leg, approval) : skipToken,
        staleTime: Infinity,
        refetchOnMount: "always" as const,
        retry: false,
      }
    }),
    combine: neededLegs,
  })
