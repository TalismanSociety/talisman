import { Balances } from "@core/domains/balances/types"
import { useMemo } from "react"

import { usePortfolio } from "../context"

export const useAssetDetails = (balances: Balances) => {
  const { hydrate, isLoading } = usePortfolio()

  const chainIds = useMemo(
    () =>
      [...new Set(balances.sorted.map((b) => b.chainId ?? b.evmNetworkId))].filter(
        (cid) => cid !== undefined
      ),
    [balances.sorted]
  )

  const balancesByChain = useMemo(() => {
    return chainIds.reduce(
      (acc, chainId) => ({
        ...acc,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        [chainId!]: new Balances(
          balances.sorted.filter((b) => b.chainId === chainId || b.evmNetworkId === chainId),
          hydrate
        ),
      }),
      {} as Record<string | number, Balances>
    )
  }, [balances.sorted, chainIds, hydrate])

  return { balancesByChain, isLoading }
}
