import { Balances } from "@core/domains/balances/types"
import { filterMirrorTokens } from "@talisman/util/filterMirrorBalances"
import { useMemo } from "react"

export const useBalancesWithoutMirrorTokens = (balances: Balances) => {
  return useMemo(() => new Balances(balances.sorted.filter(filterMirrorTokens)), [balances.sorted])
}
