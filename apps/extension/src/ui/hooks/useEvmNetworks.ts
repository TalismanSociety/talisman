import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useEvmNetworks = (withTestnets: boolean) => {
  // keep db up to date
  useDbCacheSubscription("evmNetworks")

  const {
    evmNetworksWithTestnets,
    evmNetworksWithoutTestnets,
    evmNetworksWithTestnetsMap,
    evmNetworksWithoutTestnetsMap,
  } = useDbCache()

  return {
    evmNetworks: withTestnets ? evmNetworksWithTestnets : evmNetworksWithoutTestnets,
    evmNetworksMap: withTestnets ? evmNetworksWithTestnetsMap : evmNetworksWithoutTestnetsMap,
  }
}
