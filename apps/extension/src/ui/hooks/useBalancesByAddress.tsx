import { Address } from "@core/types/base"
import { balancesQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

import { useDbCacheSubscription } from "./useDbCacheSubscription"

const useBalancesByAddress = (address: Address) => {
  // TODO would be nice to subscribe only to this address's balances changes
  useDbCacheSubscription("balances")
  useDbCacheSubscription("chains")
  useDbCacheSubscription("evmNetworks")
  useDbCacheSubscription("tokens")
  useDbCacheSubscription("tokenRates")

  return useRecoilValue(balancesQuery({ address }))
}

export default useBalancesByAddress
