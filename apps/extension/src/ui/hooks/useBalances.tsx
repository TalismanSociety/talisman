import { Balances } from "@core/domains/balances/types"
import { deriveStatuses, getValidSubscriptionIds } from "@talismn/balances"
import { useMemo } from "react"

import { useBalancesHydrate } from "./useBalancesHydrate"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalances = () => {
  // keep db data up to date
  useDbCacheSubscription("balances")
  const { balances } = useDbCache()

  const hydrate = useBalancesHydrate()

  return useMemo(
    () => new Balances(deriveStatuses([...getValidSubscriptionIds()], balances), hydrate),
    [balances, hydrate]
  )
}
export default useBalances
