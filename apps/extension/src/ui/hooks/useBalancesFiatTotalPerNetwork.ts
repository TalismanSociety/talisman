import type { Balances } from "@talismn/balances"
import { useSelectedCurrency } from "@ui/state"
import { fromPairs, uniq } from "lodash-es"
import { useMemo } from "react"

export const useBalancesFiatTotalPerNetwork = (balances: Balances) => {
  const currency = useSelectedCurrency()

  return useMemo<Record<string, number>>(
    () =>
      fromPairs(
        uniq(balances.each.map((b) => b.networkId)).map((networkId) => [
          networkId,
          balances.find({ networkId }).sum.fiat(currency).total,
        ])
      ),
    [balances, currency]
  )
}
