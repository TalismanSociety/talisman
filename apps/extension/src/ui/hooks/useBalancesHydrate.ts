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
    chainsMap: chains,
    evmNetworksMap: evmNetworks,
    tokensMap: tokens,
    tokenRatesMap: tokenRates,
  } = useDbCache()

  return useMemo(
    () => ({ chains, evmNetworks, tokens, tokenRates }),
    [chains, evmNetworks, tokens, tokenRates]
  )
}
