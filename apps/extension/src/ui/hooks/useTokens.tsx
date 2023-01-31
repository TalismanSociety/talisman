import { useMemo } from "react"

import useChains from "./useChains"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"
import { useEvmNetwork } from "./useEvmNetwork"
import { useEvmNetworks } from "./useEvmNetworks"

export const useTokens = (withTestnet: boolean) => {
  // keep db table up to date
  useDbCacheSubscription("tokens")

  const {
    tokensWithTestnets,
    tokensWithoutTestnets,
    tokensWithTestnetsMap,
    tokensWithoutTestnetsMap,
  } = useDbCache()

  return {
    tokens: withTestnet ? tokensWithTestnets : tokensWithoutTestnets,
    tokensMap: withTestnet ? tokensWithTestnetsMap : tokensWithoutTestnetsMap,
  }
}

export default useTokens
