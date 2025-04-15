import { isNotNil } from "@talismn/util"
import { Balances, ChainId, EvmNetworkId } from "extension-core"
import { useMemo } from "react"

export const usePortfolioNetworkIds = (balances: Balances) => {
  return useMemo<(ChainId | EvmNetworkId)[]>(
    () =>
      [
        ...new Set(
          balances.each
            .filter((b) => b.total.planck > 0)
            .map((b) => b.chain?.id ?? b.evmNetwork?.id),
        ),
      ].filter(isNotNil),
    [balances],
  )
}
