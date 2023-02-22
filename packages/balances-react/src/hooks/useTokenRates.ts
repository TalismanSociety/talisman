import { TokenId } from "@talismn/chaindata-provider"

import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export function useTokenRates() {
  // keep db data up to date
  useDbCacheSubscription("tokenRates")

  const { tokenRatesMap } = useDbCache()
  return tokenRatesMap
}

export function useTokenRate(tokenId?: TokenId) {
  const tokenRates = useTokenRates()
  return tokenId ? tokenRates[tokenId] : undefined
}
