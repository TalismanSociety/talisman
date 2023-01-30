import { Balances } from "@core/domains/balances/types"
import { useMemo } from "react"

import { useBalancesHydrate } from "./useBalancesHydrate"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalances = () => {
  // keep db data up to date
  useDbCacheSubscription("balances")
  const { allBalances } = useDbCache()

  const hydrate = useBalancesHydrate()

  const balances = useMemo(() => new Balances(allBalances, hydrate), [allBalances, hydrate])

  return balances
}
export default useBalances
