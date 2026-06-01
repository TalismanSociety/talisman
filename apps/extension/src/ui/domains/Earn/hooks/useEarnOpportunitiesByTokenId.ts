import type { YieldDto } from "@core/domains/earn/exports"
import { parseTokenId, type TokenId } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { isNotNil, type Loadable } from "@talismn/util"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalances } from "@ui/state/balances"
import { useSelectedCurrency } from "@ui/state/settings"
import { useYieldxyzProducts } from "@ui/state/yieldxyz"
import { useMemo } from "react"

import { useSeekStakingOpportunity } from "../seek/useSeekStaking"
import type { EarnOpportunity, TokenOpportunity } from "../types"
import { useGetYieldxyzToken } from "../yieldxyz/hooks/useGetYieldxyzToken"

const MIN_REWARD_RATE = 0.001
const ALLOW_NO_STATISTICS = true

export type YieldxyzEarnOpportunity = EarnOpportunity & {
  product: YieldDto
}

export type SeekEarnOpportunity = EarnOpportunity & {
  providerId: "seek"
}

export type EarnOpportunityUnion = YieldxyzEarnOpportunity | SeekEarnOpportunity

const isEnterableYieldProduct = (product: YieldDto) =>
  product.status.enter &&
  product.rewardRate.total >= MIN_REWARD_RATE &&
  (ALLOW_NO_STATISTICS || product.statistics?.tvl) &&
  !product.mechanics.arguments?.enter?.fields?.some(
    (field) => field.required && field.name !== "amount"
  )

export const useEarnOpportunitiesByTokenId = (): Loadable<TokenOpportunity[]> & {
  heldProducts: TokenOpportunity[]
  discoverProducts: TokenOpportunity[]
} => {
  const { selectedAccounts } = usePortfolioNavigation()
  const balances = useBalances()
  const products = useYieldxyzProducts()
  const seekOpportunity = useSeekStakingOpportunity()
  const { getYieldxyzTokenId } = useGetYieldxyzToken()
  const currency = useSelectedCurrency()

  const accountBalances = useMemo(() => {
    const accountIds = new Set(selectedAccounts.map((acc) => normalizeAddress(acc.address)))
    return balances.find((b) => accountIds.has(normalizeAddress(b.address)))
  }, [balances, selectedAccounts])

  const yieldOpportunitiesByTokenId = useMemo((): Record<TokenId, YieldxyzEarnOpportunity[]> => {
    const oppsByTokenId =
      products.data
        ?.filter(isEnterableYieldProduct)
        .reduce<Record<TokenId, YieldxyzEarnOpportunity[]>>((acc, product) => {
          const inputTokenIds = product.inputTokens
            ?.map((inputToken) => getYieldxyzTokenId(inputToken))
            .filter(isNotNil) as TokenId[]

          const inputTokenId =
            inputTokenIds.length === 1
              ? inputTokenIds[0]
              : inputTokenIds.find((tokenId) =>
                  ["evm-native", "substrate-native", "sol-native"].includes(
                    parseTokenId(tokenId).type
                  )
                )

          if (!inputTokenId) return acc

          if (!acc[inputTokenId]) acc[inputTokenId] = []
          acc[inputTokenId].push({
            id: `yieldxyz-${product.id}`,
            system: "yieldxyz",
            providerId: product.providerId,
            providerName: product.providerId,
            providerLogoURI: null,
            tokenId: inputTokenId,
            networkId: inputTokenId.split(":")[0],
            title: product.metadata.name,
            type: product.mechanics.type,
            apr: product.rewardRate.total * 100,
            searchTerms: [
              product.metadata.name,
              product.providerId,
              product.mechanics.type,
              ...(product.tags ?? []),
            ],
            product,
          })

          return acc
        }, {}) || {}

    return Object.fromEntries(
      Object.entries(oppsByTokenId).map(([tokenId, opps]) => [
        tokenId,
        opps.sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0)),
      ])
    ) as Record<TokenId, YieldxyzEarnOpportunity[]>
  }, [products.data, getYieldxyzTokenId])

  const allProducts = useMemo(() => {
    const byTokenId: Record<TokenId, EarnOpportunityUnion[]> = { ...yieldOpportunitiesByTokenId }

    if (seekOpportunity.data) {
      const tokenOpportunities = byTokenId[seekOpportunity.data.tokenId] ?? []
      byTokenId[seekOpportunity.data.tokenId] = [
        ...tokenOpportunities,
        seekOpportunity.data as SeekEarnOpportunity,
      ].sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0))
    }

    return Object.entries(byTokenId).map(([tokenId, opportunities]) => ({
      tokenId: tokenId as TokenId,
      opportunities,
      bestApr: Math.max(0, ...opportunities.map((opp) => opp.apr ?? 0)),
      balances: accountBalances.find({ tokenId }),
    }))
  }, [accountBalances, seekOpportunity.data, yieldOpportunitiesByTokenId])

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

  const status =
    products.status === "loading" || seekOpportunity.status === "pending"
      ? "loading"
      : products.status === "error" || seekOpportunity.status === "error"
        ? "error"
        : "success"

  return {
    status,
    data: allProducts,
    heldProducts,
    discoverProducts,
  } as Loadable<TokenOpportunity[]> & {
    heldProducts: TokenOpportunity[]
    discoverProducts: TokenOpportunity[]
  }
}
