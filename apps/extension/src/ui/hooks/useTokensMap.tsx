import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"
import useTokens from "./useTokens"

/**
 *
 * @deprecated use useTokens instead
 */
export const useTokensMap = () => {
  // keep db table up to date
  useDbCacheSubscription("tokens")

  const { tokensMap } = useTokens(false)

  return tokensMap
}

export default useTokensMap
