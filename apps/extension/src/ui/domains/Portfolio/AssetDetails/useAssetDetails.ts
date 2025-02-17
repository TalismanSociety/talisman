import { TokenId } from "@talismn/chaindata-provider"
import { Balances } from "extension-core"
import { uniq } from "lodash"
import { useMemo } from "react"

import { usePortfolio, useSelectedCurrency } from "@ui/state"

export const useAssetDetails = (balances: Balances) => {
  const { hydrate } = usePortfolio()
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
          if (aTokenId.toLowerCase() === "polkadot-substrate-native") return -1
          if (bTokenId.toLowerCase() === "polkadot-substrate-native") return 1
          if (aTokenId.toLowerCase() === "kusama-substrate-native") return -1
          if (bTokenId.toLowerCase() === "kusama-substrate-native") return 1

          // keep alphabetical sort
          return 0
        }),
    [balances, currency, hydrate, tokenIds],
  )

  return { balancesByToken }
}
