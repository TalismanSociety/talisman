import { Balances } from "@core/domains/balances/types"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { usePortfolio } from "../context"

export const useAssetDetails = (balances: Balances) => {
  const { hydrate, isLoading } = usePortfolio()

  const chainIds = useMemo(
    () =>
      [...new Set(balances.sorted.map((b) => b.chainId ?? b.evmNetworkId))].filter(
        (cid) => cid !== undefined
      ) as (ChainId | EvmNetworkId)[],
    [balances.sorted]
  )

  const balancesByChain = useMemo(() => {
    return chainIds.reduce(
      (acc, chainId) => ({
        ...acc,
        [chainId]: new Balances(
          balances.sorted.filter((b) => b.chainId === chainId || b.evmNetworkId === chainId),
          hydrate
        ),
      }),
      {} as Record<ChainId | EvmNetworkId, Balances>
    )
  }, [balances.sorted, chainIds, hydrate])

  return { balancesByChain, isLoading }
}
