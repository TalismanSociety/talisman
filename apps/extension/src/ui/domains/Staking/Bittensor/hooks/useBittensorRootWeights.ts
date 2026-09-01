import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import type { RootWeightEntry } from "../utils/rootWeights"

/**
 * Declared root weights of a validator (`get_validator_weights`): how its root-stake
 * fund allocates deposits across subnets. An empty vector means the validator never
 * set weights (uncurated fund) — stakers still earn, dividends accumulate in place
 * following raw subnet emissions.
 */
export const useBittensorRootWeights = (networkId: DotNetworkId | undefined, hotkey: string) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useBittensorRootWeights", sapi?.id, hotkey],
    queryFn: async () => {
      if (!sapi) throw new Error("Chain connection not ready")
      return sapi.getRuntimeCallValue<RootWeightEntry[]>(
        "BetaBasketRuntimeApi",
        "get_validator_weights",
        [hotkey]
      )
    },
    enabled: !!sapi,
    staleTime: 5 * 60_000,
  })
}
