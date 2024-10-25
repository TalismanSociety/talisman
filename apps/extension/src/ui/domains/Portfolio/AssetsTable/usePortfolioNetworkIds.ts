import { useMemo } from "react"

import { Balances, ChainId, EvmNetworkId } from "@extension/core"

export const usePortfolioNetworkIds = (balances: Balances) => {
  return useMemo(
    () =>
      [
        ...new Set(
          balances.each
            .filter((b) => b.total.planck > 0)
            .map((b) => b.chain?.id ?? b.evmNetwork?.id),
        ),
      ].filter(Boolean) as (ChainId | EvmNetworkId)[],
    [balances],
  )
}
