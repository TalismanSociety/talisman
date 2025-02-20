import { Balances } from "@talismn/balances"
import { useMemo } from "react"

import { useSelectedCurrency } from "@ui/state"

export const useBalancesFiatTotal = (balances: Balances) => {
  const currency = useSelectedCurrency()
  return useMemo(() => balances.sum.fiat(currency).total, [balances, currency])
}
