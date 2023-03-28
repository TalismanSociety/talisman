import { Balances } from "@core/domains/balances/types"
import { deriveStatuses } from "@talismn/balances"
import { useMemo } from "react"

import { useBalancesHydrate } from "./useBalancesHydrate"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalances = () => {
  // keep db data up to date
  useDbCacheSubscription("balances")
  const { balances, balancesMeta } = useDbCache()

  const hydrate = useBalancesHydrate()

  return useMemo(
    () => new Balances(deriveStatuses(balancesMeta.subscriptionId, balances), hydrate),
    [balancesMeta.subscriptionId, balances, hydrate]
  )
}
export default useBalances
