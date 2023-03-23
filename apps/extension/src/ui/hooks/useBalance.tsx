import { TokenId } from "@core/domains/tokens/types"
import { balancesQuery } from "@ui/atoms"
import { useMemo } from "react"
import { useRecoilValue } from "recoil"

import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalance = (address: string, tokenId: TokenId) => {
  // TODO would be nice to subscribe only to this address and token changes
  useDbCacheSubscription("balances")
  useDbCacheSubscription("chains")
  useDbCacheSubscription("evmNetworks")
  useDbCacheSubscription("tokens")
  useDbCacheSubscription("tokenRates")

  const balances = useRecoilValue(balancesQuery({ address, tokenId }))

  return useMemo(() => [...balances][0], [balances])
}
