import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { isNotNil, Loadable } from "@talismn/util"
import { YieldDto } from "extension-core"
import { uniq } from "lodash-es"
import { useMemo } from "react"

import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalances, useSelectedCurrency } from "@ui/state"
import { useYieldxyzProducts } from "@ui/state/yieldxyz"

import { useGetYieldxyzToken } from "../yieldxyz/hooks/useGetYieldxyzToken"

export const useYieldxyzProductsByTokenId = (): Loadable<
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
    // keep only products for which we have all input tokens
    const oppsByTokenId =
      products.data
        ?.filter((p) => p.rewardRate.total && p.statistics?.tvl) // a bunch are 0 reward while they are "under maintenance"
        .filter((product) => {
          const inputTokenIds = product.inputTokens
            ?.map((inputToken) => {
              const tokenId = getYieldxyzTokenId(inputToken)
              return availableTokenIds.includes(tokenId || "") ? tokenId : null
              // TODO check that at least one account owns all tokens, or its not a valid product
            })
            .filter(Boolean) as string[]

          // check if all input token ids are in availableTokenIds
          return inputTokenIds.length === product.inputTokens.length
        })
        .reduce<Record<TokenId, YieldDto[]>>((acc, product) => {
          const inputTokenIds = product.inputTokens
            ?.map((inputToken) => getYieldxyzTokenId(inputToken))
            .filter(isNotNil) as TokenId[]

          inputTokenIds.forEach((tokenId) => {
            if (!acc[tokenId]) acc[tokenId] = []
            acc[tokenId].push(product)
          })

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

  return {
    ...products,
    data,
  }
}
