import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useTokenRatesMap = () => {
  // keep db table up to date
  useDbCacheSubscription("tokenRates")

  const { tokenRatesMap } = useDbCache()

  return tokenRatesMap
}
