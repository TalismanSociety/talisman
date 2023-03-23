import { HydrateDb } from "@talismn/balances"
import { balancesHydrateState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalancesHydrate = (): HydrateDb => {
  useDbCacheSubscription("chains")
  useDbCacheSubscription("evmNetworks")
  useDbCacheSubscription("tokens")
  useDbCacheSubscription("tokenRates")

  return useRecoilValue(balancesHydrateState)
}
