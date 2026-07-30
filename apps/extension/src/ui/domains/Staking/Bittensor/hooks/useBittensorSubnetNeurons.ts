import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useBittensorValidatorsMap } from "@ui/state/bittensor"
import { useMemo } from "react"

import { type Metagraph, normalizeMetagraph, type SubnetNeuron } from "../utils/subnetNeurons"

export type { NeuronRole, SubnetNeuron } from "../utils/subnetNeurons"

/**
 * Fetches every neuron registered on a subnet (validators + miners + the owner hotkey) for the
 * conviction-lock hotkey picker. A conviction lock can target ANY registered hotkey, not just a
 * validator, so this reads the on-chain metagraph rather than the validators-only TaoData API.
 *
 * The raw chain fetch is account-independent (keyed on network/netuid only); the display name is
 * enriched in a memo so a validators-registry refresh never refetches the chain.
 */
export const useBittensorSubnetNeurons = (
  networkId: DotNetworkId | null | undefined,
  netuid: number | null | undefined
) => {
  const {
    data: sapi,
    isLoading: isSapiLoading,
    isError: isSapiError,
    error: sapiError,
  } = useScaleApi(networkId)

  const { data: validatorsMap } = useBittensorValidatorsMap()

  const query = useQuery({
    queryKey: ["bittensorSubnetNeurons", networkId, netuid, sapi?.id],
    queryFn: async () => {
      if (!sapi) throw new Error("sapi not available")
      if (!sapi.isApiAvailable("SubnetInfoRuntimeApi", "get_metagraph"))
        throw new Error("get_metagraph is not available on this runtime")
      const mg = await sapi.getRuntimeCallValue<Metagraph>(
        "SubnetInfoRuntimeApi",
        "get_metagraph",
        [netuid]
      )
      return normalizeMetagraph(mg)
    },
    enabled: !!sapi && typeof netuid === "number",
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 mins
    gcTime: 10 * 60 * 1000, // 10 mins
    refetchOnReconnect: true,
    // no keepPreviousData: showing the previous subnet's metagraph across netuid/network changes
    // would let users pick a hotkey that isn't registered on the newly selected subnet
    // intentionally NOT persisted: rows carry bigint (stakeOnSubnet), and the query-storage port
    // message serializes as JSON, which throws "Could not serialize message" on bigint
  })

  const neurons = useMemo<SubnetNeuron[]>(() => {
    const raw = query.data
    if (!raw) return []
    return raw.map(({ onChainName, ...n }) => ({
      ...n,
      name: onChainName ?? validatorsMap[n.hotkey]?.name ?? null,
    }))
  }, [query.data, validatorsMap])

  return {
    neurons,
    isLoading: isSapiLoading || query.isLoading,
    isError: isSapiError || query.isError,
    error: sapiError ?? query.error ?? null,
  }
}
