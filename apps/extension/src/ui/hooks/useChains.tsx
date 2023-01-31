import { useMemo } from "react"

import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useChains = (withTestnets: boolean) => {
  // keep db data up to date
  useDbCacheSubscription("chains")

  const {
    chainsWithTestnets,
    chainsWithoutTestnets,
    chainsWithTestnetsMap,
    chainsWithoutTestnetsMap,
  } = useDbCache()

  return {
    chains: withTestnets ? chainsWithTestnets : chainsWithoutTestnets,
    chainsMap: withTestnets ? chainsWithTestnetsMap : chainsWithoutTestnetsMap,
  }
}

export default useChains
