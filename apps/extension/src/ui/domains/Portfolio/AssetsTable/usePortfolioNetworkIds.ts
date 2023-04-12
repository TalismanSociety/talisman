import { Balances } from "@core/domains/balances/types"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

export const usePortfolioNetworkIds = (balances: Balances) => {
  return useMemo(
    () =>
      [
        ...new Set(
          balances.each
            .filter((b) => b.total.planck > 0)
            .map((b) => b.chain?.id ?? b.evmNetwork?.id)
        ),
      ].filter(Boolean) as (ChainId | EvmNetworkId)[],
    [balances]
  )
}
