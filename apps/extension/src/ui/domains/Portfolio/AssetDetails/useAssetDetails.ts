import { Balances, ChainId, EvmNetworkId } from "@extension/core"
import { useMemo } from "react"

import { usePortfolio } from "../usePortfolio"

export const useAssetDetails = (balances: Balances) => {
  const { hydrate } = usePortfolio()

  const chainIds = useMemo<Array<ChainId | EvmNetworkId>>(
    () => [...new Set(balances.each.flatMap((b) => b.chainId ?? b.evmNetworkId ?? []))],
    [balances.each]
  )

  const balancesByChain = useMemo(
    () =>
      chainIds
        .map<[ChainId | EvmNetworkId, Balances]>((chainId) => [
          chainId,
          new Balances(
            balances.find((b) => b.chainId === chainId || b.evmNetworkId === chainId),
            hydrate
          ),
        ])
        .sort(([aChainId, aBalances], [bChainId, bBalances]) => {
          // sort by planck value (in asset details all values are of the same token)
          if (aBalances.sum.planck.total > bBalances.sum.planck.total) return -1
          if (aBalances.sum.planck.total < bBalances.sum.planck.total) return 1

          // sort by "has a balance or not" (values don't matter)
          const aHasBalance = !!aBalances.each.find((b) => b.transferable.planck > 0n)
          const bHasBalance = !!bBalances.each.find((b) => b.transferable.planck > 0n)
          if (aHasBalance && !bHasBalance) return -1
          if (!aHasBalance && bHasBalance) return 1

          // polkadot and kusama should appear first
          if (aChainId.toLowerCase() === "polkadot") return -1
          if (bChainId.toLowerCase() === "polkadot") return 1
          if (aChainId.toLowerCase() === "kusama") return -1
          if (bChainId.toLowerCase() === "kusama") return 1

          // keep alphabetical sort
          return 0
        }),
    [balances, chainIds, hydrate]
  )

  return { balancesByChain }
}
