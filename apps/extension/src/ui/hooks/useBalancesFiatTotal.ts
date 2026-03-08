import type { Balances } from "@talismn/balances"
import { useSelectedCurrency } from "@ui/state/settings"
import { useMemo } from "react"

export const useBalancesFiatTotal = (balances: Balances | null | undefined) => {
  const currency = useSelectedCurrency()
  return useMemo(() => balances?.sum.fiat(currency).total ?? 0, [balances, currency])
}
