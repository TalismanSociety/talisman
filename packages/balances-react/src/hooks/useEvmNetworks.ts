import { EvmNetworkId } from "@talismn/chaindata-provider"

import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export function useEvmNetworks(withTestnets?: boolean) {
  // keep db data up to date
  useDbCacheSubscription("evmNetworks")

  const { evmNetworksWithTestnetsMap, evmNetworksWithoutTestnetsMap } = useDbCache()
  return withTestnets ? evmNetworksWithTestnetsMap : evmNetworksWithoutTestnetsMap
}

export function useEvmNetwork(evmNetworkId?: EvmNetworkId, withTestnets?: boolean) {
  const evmNetworks = useEvmNetworks(withTestnets)
  return evmNetworkId ? evmNetworks[evmNetworkId] : undefined
}
