import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useEvmNetworks = () => {
  // keep db up to date
  useDbCacheSubscription("evmNetworks")

  const { allEvmNetworks } = useDbCache()

  return allEvmNetworks
}
