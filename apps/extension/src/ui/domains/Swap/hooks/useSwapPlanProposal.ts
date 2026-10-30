import { log } from "@common/log"
import { db } from "@core/db"
import { toPersistedLeg } from "@core/domains/swaps/plans/helpers"
import type { PersistedQuoteLeg, SwapPlanId } from "@core/domains/swaps/plans/types"
import type {
  BaseQuote,
  BuiltLeg,
  NonEmpty,
  SwapPlanProposeRequest,
} from "@core/domains/swaps/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { hashKey, useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useEffect, useMemo } from "react"

import type { BuiltSwap } from "../buildSwapTransaction"
import type { SwapModule } from "../swap-modules/common.swap-module"
import { useSwapModules } from "../swaps.api"

const isMultiLegQuote = (quote: BaseQuote | null | undefined): quote is BaseQuote =>
  !!quote && quote.legs.length > 1

/** the module that builds the quote's first leg: a multi-leg quote starts with another module's leg */
export const useFirstLegModule = (
  quote: BaseQuote | null | undefined,
  selectedModule: SwapModule | null | undefined
) => {
  const swapModules = useSwapModules()
  return useMemo(() => {
    if (!isMultiLegQuote(quote)) return selectedModule
    return swapModules.find((module) => module.protocol === quote.legs[0].protocol)
  }, [quote, selectedModule, swapModules])
}

const newPlanId = () => crypto.randomUUID() as SwapPlanId

/** a proposed plan nobody signed holds its intermediate account until it expires */
const cancelIfProposed = async (id: SwapPlanId) => {
  const plan = await db.swapPlans.get(id)
  if (plan?.phase === "proposed") await api.swapPlanCancel(id)
}

type SwapPlanProposalParams = {
  built: BuiltSwap | undefined
  fromAmount: bigint | null
  toAddress: string | null
  /** the user's setting, decimal, 0.005 is 0.5% */
  slippage: number
  /** the nonce the confirm screen signs an EVM first leg with, once it has prepared the transaction */
  evmNonce: number | undefined
}

/** the nonce leg 0 is signed with, which the background pins the plan to: null until it is known */
const leg0Nonce = (leg: BuiltLeg, evmNonce: number | undefined): number | null => {
  switch (leg.transaction.platform) {
    case "polkadot":
      return Number(leg.transaction.payload.nonce)
    case "ethereum":
      return evmNonce ?? null
    default:
      return null
  }
}

/** the user's tolerance reaches only a provider that lets the user set it, the others apply their own minimum */
const planSlippage = (provider: SwapModule | undefined, slippage: number) =>
  provider?.supportsSlippageSetting === true ? slippage : 0

/**
 * Proposes the plan of a multi-leg quote once its first leg is built, so the background holds the
 * approved legs before the user signs the first one. Each proposal is a new plan: the background
 * never changes the legs of a plan, and the one it holds is always the one on screen. A single-leg
 * quote passes through unchanged.
 */
export const useSwapPlanProposal = ({
  built,
  fromAmount,
  toAddress,
  slippage,
  evmNonce,
}: SwapPlanProposalParams) => {
  const quote = built?.quote
  const leg = built?.leg
  const isMultiLeg = isMultiLegQuote(quote)
  const swapModules = useSwapModules()
  const provider = swapModules.find((module) => module.protocol === quote?.protocol)

  const content = useMemo((): Omit<SwapPlanProposeRequest, "id"> | null => {
    if (!isMultiLeg || !leg || !fromAmount || !toAddress) return null
    const nonce = leg0Nonce(leg, evmNonce)
    if (nonce === null) return null
    if (!quote.legs.every((leg) => leg.signer && leg.recipient)) return null
    return {
      legs: quote.legs.map(toPersistedLeg) as NonEmpty<PersistedQuoteLeg>,
      summary: {
        protocol: quote.protocol,
        subProtocol: quote.subProtocol,
        provider: { name: quote.providerName, logo: quote.providerLogo },
        slippage: planSlippage(provider, slippage),
      },
      leg0Nonce: nonce,
    }
  }, [evmNonce, leg, fromAmount, isMultiLeg, provider, quote, slippage, toAddress])

  const contentKey = content && hashKey([content])
  const planId = useMemo(() => (contentKey ? newPlanId() : null), [contentKey])
  const proposal = useMemo(
    (): SwapPlanProposeRequest | null => content && planId && { ...content, id: planId },
    [content, planId]
  )

  useEffect(() => {
    if (!planId) return
    return () => {
      cancelIfProposed(planId).catch((err) =>
        log.debug("Failed to cancel a proposed swap plan", { err })
      )
    }
  }, [planId])

  const proposeQuery = useQuery({
    queryKey: ["swap-plan-propose", proposal?.id],
    queryFn: () => {
      if (!proposal) throw new Error("Missing swap plan")
      return api.swapPlanPropose(proposal)
    },
    enabled: !!proposal,
    staleTime: Infinity,
    retry: false,
  })

  const txInfo = useMemo<WalletTransactionInfo | undefined>(
    () => (leg && proposal ? { ...leg.txInfo, plan: { id: proposal.id, leg: 0 } } : leg?.txInfo),
    [leg, proposal]
  )

  /** the first leg's fees as built, the later legs' as quoted */
  const fees = useMemo(
    () =>
      leg && isMultiLeg
        ? [...leg.fees, ...quote.legs.slice(1).flatMap((later) => later.fees)]
        : leg?.fees,
    [leg, isMultiLeg, quote]
  )

  return {
    isMultiLeg,
    txInfo,
    fees,
    isProposing: isMultiLeg && (!proposeQuery.isSuccess || proposeQuery.isFetching),
    proposeError: isMultiLeg ? proposeQuery.error : null,
  }
}
