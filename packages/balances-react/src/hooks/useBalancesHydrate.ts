import { HydrateDb } from "@talismn/balances"
import { useMemo } from "react"

import { useChains } from "./useChains"
import { useDbCache } from "./useDbCache"
import { useEvmNetworks } from "./useEvmNetworks"
import { useTokens } from "./useTokens"

export const useBalancesHydrate = (withTestnets?: boolean): HydrateDb => {
  const chains = useChains(withTestnets)
  const evmNetworks = useEvmNetworks(withTestnets)
  const tokens = useTokens(withTestnets)

  // TODO: Store in a DB so that we don't have to wait for tokens before we can begin to fetch tokenRates
  // useDbCacheSubscription("tokenRates")
  const { tokenRatesMap: tokenRates } = useDbCache()

  return useMemo(
    () => ({ chains, evmNetworks, tokens, tokenRates }),
    [chains, evmNetworks, tokens, tokenRates]
  )
}
