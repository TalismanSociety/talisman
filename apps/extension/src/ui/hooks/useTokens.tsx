import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useTokens = () => {
  // keep db table up to date
  useDbCacheSubscription("tokens")

  const { allTokens } = useDbCache()

  return allTokens
}

export default useTokens
