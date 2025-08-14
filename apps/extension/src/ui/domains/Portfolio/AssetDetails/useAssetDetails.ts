import { Balances } from "@talismn/balances"
import { subNativeTokenId, TokenId } from "@talismn/chaindata-provider"
import { uniq } from "lodash-es"
import { useMemo } from "react"

import { usePortfolioGlobalData, useSelectedCurrency } from "@ui/state"

export const useAssetDetails = (balances: Balances) => {
  const { hydrate } = usePortfolioGlobalData()
  const currency = useSelectedCurrency()

  const tokenIds = useMemo<TokenId[]>(
    () => uniq(balances.each.map((b) => b.tokenId)),
    [balances.each],
  )

  const balancesByToken = useMemo(
    () =>
      tokenIds
        .map<[TokenId, Balances]>((tokenId) => [
          tokenId,
          new Balances(balances.find({ tokenId }), hydrate),
        ])
        .sort(([aTokenId, aBalances], [bTokenId, bBalances]) => {
          const aTotal = aBalances.sum.fiat(currency).total
          const bTotal = bBalances.sum.fiat(currency).total

          // sort by fiat value
          if (aTotal > bTotal) return -1
          if (aTotal < bTotal) return 1

          // sort by "has a balance or not" (values don't matter)
          const aHasBalance = !!aBalances.each.find((b) => b.transferable.planck > 0n)
          const bHasBalance = !!bBalances.each.find((b) => b.transferable.planck > 0n)
          if (aHasBalance && !bHasBalance) return -1
          if (!aHasBalance && bHasBalance) return 1

          // polkadot and kusama should appear first
          if (aTokenId.toLowerCase() === subNativeTokenId("polkadot")) return -1
          if (bTokenId.toLowerCase() === subNativeTokenId("polkadot")) return 1
          if (aTokenId.toLowerCase() === subNativeTokenId("kusama")) return -1
          if (bTokenId.toLowerCase() === subNativeTokenId("kusama")) return 1

          // keep alphabetical sort
          return 0
        }),
    [balances, currency, hydrate, tokenIds],
  )

  return { balancesByToken }
}
