import type { TokenId } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import type { Loadable } from "@talismn/util"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalances } from "@ui/state/balances"
import { useSelectedCurrency } from "@ui/state/settings"
import { useMemo } from "react"

import { useEarnSystemOpportunities } from "../systems/registry"
import { combineEarnStatuses, toEarnLoadable } from "../systems/status"
import type { EarnOpportunity, TokenOpportunity } from "../types"

export const useEarnOpportunitiesByTokenId = (): Loadable<TokenOpportunity[]> & {
  heldProducts: TokenOpportunity[]
  discoverProducts: TokenOpportunity[]
} => {
  const { selectedAccounts } = usePortfolioNavigation()
  const balances = useBalances()
  const currency = useSelectedCurrency()
  const systemResults = useEarnSystemOpportunities()

  const accountBalances = useMemo(() => {
    const accountIds = new Set(selectedAccounts.map((acc) => normalizeAddress(acc.address)))
    return balances.find((b) => accountIds.has(normalizeAddress(b.address)))
  }, [balances, selectedAccounts])

  const allProducts = useMemo(() => {
    // merge every system's opportunities grouped by token (registry order), then sort each token's
    // list by APR descending
    const byTokenId: Record<TokenId, EarnOpportunity[]> = {}
    for (const result of systemResults)
      for (const [tokenId, opportunities] of Object.entries(result.byTokenId)) {
        const key = tokenId as TokenId
        byTokenId[key] = (byTokenId[key] ?? []).concat(opportunities)
      }

    return Object.entries(byTokenId).map(([tokenId, opportunities]) => ({
      tokenId: tokenId as TokenId,
      opportunities: [...opportunities].sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0)),
      bestApr: Math.max(0, ...opportunities.map((opp) => opp.apr ?? 0)),
      balances: accountBalances.find({ tokenId }),
    }))
  }, [accountBalances, systemResults])

  const heldProducts = useMemo(
    () =>
      allProducts
        .filter((p) => (p.balances.sum.fiat(currency).transferable ?? 0) > 0)
        .sort((a, b) => {
          const balance1 = a.balances.sum.fiat(currency).transferable ?? 0
          const balance2 = b.balances.sum.fiat(currency).transferable ?? 0
          return balance2 - balance1
        }),
    [allProducts, currency]
  )

  const discoverProducts = useMemo(
    () =>
      allProducts
        .filter((p) => (p.balances.sum.fiat(currency).transferable ?? 0) === 0)
        .sort((a, b) => b.bestApr - a.bestApr),
    [allProducts, currency]
  )

  const status = combineEarnStatuses(systemResults.map((result) => result.status))

  return {
    ...toEarnLoadable(status, allProducts),
    heldProducts,
    discoverProducts,
  }
}
