import { TokenId } from "@talismn/chaindata-provider"

import { useDbCache } from "./useDbCache"
import { useDbCacheTokenRatesSubscription } from "./useDbCacheSubscription"

export function useTokenRates() {
  // keep db data up to date
  useDbCacheTokenRatesSubscription()

  const { tokenRatesMap } = useDbCache()
  return tokenRatesMap
}

export function useTokenRate(tokenId?: TokenId) {
  const tokenRates = useTokenRates()
  return tokenId ? tokenRates[tokenId] : undefined
}
