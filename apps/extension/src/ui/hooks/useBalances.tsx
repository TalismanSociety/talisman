import { Balances } from "@core/domains/balances/types"
import { useMemo } from "react"

import { useBalancesHydrate } from "./useBalancesHydrate"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalances = (withTestnets: boolean) => {
  // keep db data up to date
  useDbCacheSubscription("balances")
  const { balancesWithTestnets, balancesWithoutTestnets } = useDbCache()

  const hydrate = useBalancesHydrate()

  const balances = useMemo(
    () => new Balances(withTestnets ? balancesWithTestnets : balancesWithoutTestnets, hydrate),
    [balancesWithTestnets, balancesWithoutTestnets, hydrate, withTestnets]
  )

  return balances
}
export default useBalances
