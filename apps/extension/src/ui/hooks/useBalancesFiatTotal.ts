import { Balances } from "@talismn/balances"
import { useMemo } from "react"

import { useSelectedCurrency } from "@ui/state"

export const useBalancesFiatTotal = (balances: Balances | null | undefined) => {
  const currency = useSelectedCurrency()
  return useMemo(() => balances?.sum.fiat(currency).total ?? 0, [balances, currency])
}
