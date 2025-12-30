import { Balances } from "@talismn/balances"
import { parseTokenId, TokenId } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { isNotNil, Loadable } from "@talismn/util"
import { YieldDto } from "extension-core"
import { log } from "extension-shared"
import { uniq } from "lodash-es"
import { useEffect, useMemo } from "react"

import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalances, useSelectedCurrency, useYieldxyzProducts } from "@ui/state"

import { useGetYieldxyzToken } from "./useGetYieldxyzToken"

const MIN_REWARD_RATE = 0.01
const ALLOW_NO_STATISTICS = true

export const useYieldxyzOpportunitiesByTokenId = (): Loadable<
  {
    tokenId: string
    products: YieldDto[]
    bestApr: number
    balances: Balances
  }[]
> => {
  const { selectedAccounts } = usePortfolioNavigation()
  const balances = useBalances()
  const products = useYieldxyzProducts()

  const accountBalances = useMemo(() => {
    const accountIds = new Set(selectedAccounts.map((acc) => normalizeAddress(acc.address)))
    return balances.find((b) => accountIds.has(normalizeAddress(b.address)))
  }, [balances, selectedAccounts])

  // all token ids where the selected accounts have any balance
  const availableTokenIds = useMemo(() => {
    return uniq(accountBalances.each.map((b) => b.tokenId)).sort()
  }, [accountBalances])

  const { getYieldxyzTokenId } = useGetYieldxyzToken()

  const productsByTokenId = useMemo((): Record<TokenId, YieldDto[]> => {
    // keep only products for which we have one the input tokens (or the native token if multiple input tokens)
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
            !p.mechanics.arguments?.enter?.fields?.some((f) => f.required && f.name !== "amount"),
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
                    parseTokenId(tokenId).type,
                  ),
                )

          // ensure we have balance for it
          if (inputTokenId && availableTokenIds.includes(inputTokenId)) {
            if (!acc[inputTokenId]) acc[inputTokenId] = []
            acc[inputTokenId].push(product)
          }

          return acc
        }, {}) || {}

    // for each token, sort products by reward rate descending
    return Object.entries(oppsByTokenId).reduce(
      (acc, [tokenId, opps]) => {
        acc[tokenId as TokenId] = opps.sort(
          (a, b) => (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0),
        )
        return acc
      },
      {} as Record<TokenId, YieldDto[]>,
    )
  }, [products.data, getYieldxyzTokenId, availableTokenIds])

  const currency = useSelectedCurrency()

  const data = useMemo(() => {
    return Object.entries(productsByTokenId)
      .map(([tokenId, products]) => ({
        tokenId,
        products,
        bestApr: Math.max(...products.map((opp) => opp.rewardRate.total * 100)),
        balances: accountBalances.find({ tokenId }),
      }))
      .sort((a, b) => {
        const balance1 = a.balances.sum.fiat(currency).transferable
        const balance2 = b.balances.sum.fiat(currency).transferable
        return (balance2 || 0) - (balance1 || 0)
      })
  }, [productsByTokenId, accountBalances, currency])

  useEffect(() => {
    const products = Object.values(productsByTokenId).flat()
    log.debug("[earn] yield.xyz products with specifics", {
      warmup: products.filter((p) => p.mechanics.warmupPeriod),
      lockup: products.filter((p) => p.mechanics.lockupPeriod),
      cooldown: products.filter((p) => p.mechanics.cooldownPeriod),
      apr: products.filter((p) => p.rewardRate.rateType === "APR"),
      manualClaim: products.filter((p) => p.mechanics.rewardClaiming === "manual"),
    })
  }, [productsByTokenId])

  return {
    ...products,
    data,
  }
}
