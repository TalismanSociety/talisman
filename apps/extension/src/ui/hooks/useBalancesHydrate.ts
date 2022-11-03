import { useMemo } from "react"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalancesHydrate = () => {
  useDbCacheSubscription("chains")
  useDbCacheSubscription("evmNetworks")
  useDbCacheSubscription("tokens")

  const { chainsMap: chains, evmNetworksMap: evmNetworks, tokensMap: tokens } = useDbCache()

  return useMemo(() => ({ chains, evmNetworks, tokens }), [chains, evmNetworks, tokens])
}
