import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useChains = () => {
  // keep db data up to date
  useDbCacheSubscription("chains")

  const { allChains } = useDbCache()

  return allChains
}

export default useChains
