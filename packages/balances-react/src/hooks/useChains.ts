import { ChainId } from "@talismn/chaindata-provider"

import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export function useChains(withTestnets?: boolean) {
  // keep db data up to date
  useDbCacheSubscription("chains")

  const { chainsWithTestnetsMap, chainsWithoutTestnetsMap } = useDbCache()
  return withTestnets ? chainsWithTestnetsMap : chainsWithoutTestnetsMap
}

export function useChain(chainId?: ChainId, withTestnets?: boolean) {
  const chains = useChains(withTestnets)
  return chainId ? chains[chainId] : undefined
}
