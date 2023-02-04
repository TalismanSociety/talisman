import { HydrateDb } from "@talismn/balances"
import { useMemo } from "react"

import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useBalancesHydrate = (): HydrateDb => {
  useDbCacheSubscription("chains")
  useDbCacheSubscription("evmNetworks")
  useDbCacheSubscription("tokens")
  useDbCacheSubscription("tokenRates")

  const {
    chainsWithTestnetsMap: chains,
    evmNetworksWithTestnetsMap: evmNetworks,
    tokensWithTestnetsMap: tokens,
    tokenRatesMap: tokenRates,
  } = useDbCache()

  return useMemo(
    () => ({ chains, evmNetworks, tokens, tokenRates }),
    [chains, evmNetworks, tokens, tokenRates]
  )
}
