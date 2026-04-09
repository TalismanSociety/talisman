import type { YieldDto } from "@core/domains/earn/exports"
import type { Balances } from "@talismn/balances"
import { parseTokenId, type TokenId } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { isNotNil, type Loadable } from "@talismn/util"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalances } from "@ui/state/balances"
import { useSelectedCurrency } from "@ui/state/settings"
import { useYieldxyzProducts } from "@ui/state/yieldxyz"
import { useMemo } from "react"

import { useGetYieldxyzToken } from "./useGetYieldxyzToken"

const MIN_REWARD_RATE = 0.01
const ALLOW_NO_STATISTICS = true

export type TokenOpportunity = {
  tokenId: string
  products: YieldDto[]
  bestApr: number
  balances: Balances
}

export const useYieldxyzOpportunitiesByTokenId = (): Loadable<TokenOpportunity[]> & {
  heldProducts: TokenOpportunity[]
  discoverProducts: TokenOpportunity[]
} => {
  const { selectedAccounts } = usePortfolioNavigation()
  const balances = useBalances()
  const products = useYieldxyzProducts()

  const accountBalances = useMemo(() => {
    const accountIds = new Set(selectedAccounts.map((acc) => normalizeAddress(acc.address)))
    return balances.find((b) => accountIds.has(normalizeAddress(b.address)))
  }, [balances, selectedAccounts])

  const { getYieldxyzTokenId } = useGetYieldxyzToken()

  const productsByTokenId = useMemo((): Record<TokenId, YieldDto[]> => {
    const oppsByTokenId =
      products.data
        ?.filter(
          (p) =>
            // filter out products that cannot be entered
            p.status.enter &&
            // filter out products with too low reward rate or unknown TVL
            p.rewardRate.total >= MIN_REWARD_RATE &&
            (ALLOW_NO_STATISTICS || p.statistics?.tvl) &&
            // exclude products that require a field other than the amount
            !p.mechanics.arguments?.enter?.fields?.some((f) => f.required && f.name !== "amount")
        )
        .reduce<Record<TokenId, YieldDto[]>>((acc, product) => {
          // here we consider a product can only have one input token id.
          // if technically it has multiple, then pick the native token from the list (we ensure at the store level that if multiple input tokens, one is a native token)
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

          if (inputTokenId) {
            if (!acc[inputTokenId]) acc[inputTokenId] = []
            acc[inputTokenId].push(product)
          }

          return acc
        }, {}) || {}

    // for each token, sort products by reward rate descending
    return Object.entries(oppsByTokenId).reduce(
      (acc, [tokenId, opps]) => {
        acc[tokenId as TokenId] = opps.sort(
          (a, b) => (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0)
        )
        return acc
      },
      {} as Record<TokenId, YieldDto[]>
    )
  }, [products.data, getYieldxyzTokenId])

  const currency = useSelectedCurrency()

  const allProducts = useMemo(() => {
    return Object.entries(productsByTokenId).map(([tokenId, products]) => ({
      tokenId,
      products,
      bestApr: Math.max(...products.map((opp) => opp.rewardRate.total * 100)),
      balances: accountBalances.find({ tokenId }),
    }))
  }, [productsByTokenId, accountBalances])

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

  return {
    ...products,
    data: allProducts,
    heldProducts,
    discoverProducts,
  }
}
