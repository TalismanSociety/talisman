import { Balances } from "@core/domains/balances"
import { useMemo } from "react"

export const usePortfolioNetworkIds = (balances: Balances) => {
  return useMemo(
    () =>
      [
        ...new Set(
          balances.sorted
            .filter((b) => b.total.planck > 0)
            .map((b) => b.chain?.id ?? b.evmNetwork?.id)
        ),
      ].filter(Boolean) as (number | string)[],
    [balances.sorted]
  )
}
