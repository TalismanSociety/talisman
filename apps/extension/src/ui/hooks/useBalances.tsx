import { allBalancesState } from "@ui/atoms"
import { useRecoilValue } from "recoil"

import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalances = () => {
  // keep db data up to date
  useDbCacheSubscription("balances")
  useDbCacheSubscription("chains")
  useDbCacheSubscription("evmNetworks")
  useDbCacheSubscription("tokens")
  useDbCacheSubscription("tokenRates")

  return useRecoilValue(allBalancesState)
}
export default useBalances
