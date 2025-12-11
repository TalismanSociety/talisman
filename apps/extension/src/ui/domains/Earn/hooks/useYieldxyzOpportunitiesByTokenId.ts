import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { isNotNil, Loadable } from "@talismn/util"
import { YieldDto } from "extension-core"
import { uniq } from "lodash-es"
import { useMemo } from "react"

import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalances, useSelectedCurrency } from "@ui/state"
import { useYieldxyzOpportunities } from "@ui/state/yield"

import { useGetYieldxyzToken } from "../components/useGetYieldxyzToken"

export const useYieldxyzOpportunitiesByTokenId = (): Loadable<
  {
    tokenId: string
    opportunities: YieldDto[]
    bestApr: number
    balances: Balances
  }[]
> => {
  const { selectedAccounts } = usePortfolioNavigation()
  const balances = useBalances()
  const opportunities = useYieldxyzOpportunities()

  const accountBalances = useMemo(() => {
    const accountIds = new Set(selectedAccounts.map((acc) => normalizeAddress(acc.address)))
    return balances.find((b) => accountIds.has(normalizeAddress(b.address)))
  }, [balances, selectedAccounts])

  // all token ids where the selected accounts have any balance
  const availableTokenIds = useMemo(() => {
    return uniq(accountBalances.each.map((b) => b.tokenId)).sort()
  }, [accountBalances])

  const { getYieldxyzTokenId } = useGetYieldxyzToken()

  const opportunitiesByTokenId = useMemo((): Record<TokenId, YieldDto[]> => {
    // keep only opportunities for which we have all input tokens
    const oppsByTokenId =
      opportunities.data
        ?.filter((o) => o.rewardRate.total) // a bunch are 0 reward while they are "under maintenance"
        .filter((opportunity) => {
          const inputTokenIds = opportunity.inputTokens
            ?.map((inputToken) => {
              const tokenId = getYieldxyzTokenId(inputToken)
              return availableTokenIds.includes(tokenId || "") ? tokenId : null
              // TODO check that at least one account owns all tokens, or its not a valid opportunity
            })
            .filter(Boolean) as string[]

          // check if all input token ids are in availableTokenIds
          return inputTokenIds.length === opportunity.inputTokens.length
        })
        .reduce<Record<TokenId, YieldDto[]>>((acc, opportunity) => {
          const inputTokenIds = opportunity.inputTokens
            ?.map((inputToken) => getYieldxyzTokenId(inputToken))
            .filter(isNotNil) as TokenId[]

          inputTokenIds.forEach((tokenId) => {
            if (!acc[tokenId]) acc[tokenId] = []
            acc[tokenId].push(opportunity)
          })

          return acc
        }, {}) || {}

    // for each token, sort opportunities by reward rate descending
    return Object.entries(oppsByTokenId).reduce(
      (acc, [tokenId, opps]) => {
        acc[tokenId as TokenId] = opps.sort(
          (a, b) => (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0),
        )
        return acc
      },
      {} as Record<TokenId, YieldDto[]>,
    )
  }, [opportunities.data, getYieldxyzTokenId, availableTokenIds])

  const currency = useSelectedCurrency()

  const data = useMemo(() => {
    return Object.entries(opportunitiesByTokenId)
      .map(([tokenId, opportunities]) => ({
        tokenId,
        opportunities,
        bestApr: Math.max(...opportunities.map((opp) => opp.rewardRate.total * 100)),
        balances: accountBalances.find({ tokenId }),
      }))
      .sort((a, b) => {
        const balance1 = a.balances.sum.fiat(currency).transferable
        const balance2 = b.balances.sum.fiat(currency).transferable
        return (balance2 || 0) - (balance1 || 0)
      })
  }, [opportunitiesByTokenId, accountBalances, currency])

  return {
    ...opportunities,
    data,
  }
}
