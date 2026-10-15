import { Balances } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { isTruthy } from "@talismn/util"
import { usePortfolioGlobalData } from "@ui/state/portfolio"
import { useSelectedCurrency } from "@ui/state/settings"
import { getSameNetworkMirrorTokenIds } from "@ui/util/getSameNetworkMirrorTokenIds"
import { uniq } from "lodash-es"
import { useMemo } from "react"

export const useAssetDetails = (balances: Balances) => {
  const { hydrate } = usePortfolioGlobalData()
  const currency = useSelectedCurrency()

  const tokenIds = useMemo<TokenId[]>(() => {
    const mirrorTokenIds = getSameNetworkMirrorTokenIds(
      balances.each.map((b) => b.token).filter(isTruthy)
    )
    return uniq(balances.each.map((b) => b.tokenId)).filter((id) => !mirrorTokenIds.has(id))
  }, [balances.each])

  const balancesByToken = useMemo(
    () =>
      tokenIds
        .map<[TokenId, Balances]>((tokenId) => [
          tokenId,
          new Balances(balances.find({ tokenId }), hydrate),
        ])
        .sort(([, aBalances], [, bBalances]) => {
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

          // keep alphabetical sort
          return 0
        }),
    [balances, currency, hydrate, tokenIds]
  )

  return { balancesByToken }
}
