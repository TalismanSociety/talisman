import { useMemo } from "react"
import { useDbCache } from "./useDbData"
import { useDbDataSubscription } from "./useDbDataSubscription"

export const useBalancesHydrate = () => {
  useDbDataSubscription("chains")
  useDbDataSubscription("evmNetworks")
  useDbDataSubscription("tokens")

  const { chainsMap: chains, evmNetworksMap: evmNetworks, tokensMap: tokens } = useDbCache()

  return useMemo(() => ({ chains, evmNetworks, tokens }), [chains, evmNetworks, tokens])
}
