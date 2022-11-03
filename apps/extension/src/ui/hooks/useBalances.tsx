import { Balances } from "@core/domains/balances/types"
import { useState } from "react"
import { useDebounce } from "react-use"

import { useBalancesHydrate } from "./useBalancesHydrate"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalances = () => {
  // keep db data up to date
  useDbCacheSubscription("balances")
  const { allBalances } = useDbCache()

  const hydrate = useBalancesHydrate()

  const [balances, setBalances] = useState<Balances>(() => new Balances(allBalances, hydrate))

  // debounce every 100ms to prevent hammering UI with updates
  useDebounce(() => setBalances(new Balances(allBalances, hydrate)), 100, [allBalances, hydrate])

  return balances
}
export default useBalances
