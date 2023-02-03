import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useTokens = (withTestnet: boolean) => {
  // keep db table up to date
  useDbCacheSubscription("tokens")

  const {
    tokensWithTestnets,
    tokensWithoutTestnets,
    tokensWithTestnetsMap,
    tokensWithoutTestnetsMap,
  } = useDbCache()

  return {
    tokens: withTestnet ? tokensWithTestnets : tokensWithoutTestnets,
    tokensMap: withTestnet ? tokensWithTestnetsMap : tokensWithoutTestnetsMap,
  }
}

export default useTokens
