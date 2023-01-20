import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useTokensMap = () => {
  // keep db table up to date
  useDbCacheSubscription("tokens")

  const { tokensMap } = useDbCache()

  return tokensMap
}

export default useTokensMap
