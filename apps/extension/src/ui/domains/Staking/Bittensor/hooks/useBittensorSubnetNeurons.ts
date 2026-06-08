import type { DotNetworkId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createQueryStoragePersister } from "@ui/hooks/queryStoragePersister"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useBittensorValidatorsMap } from "@ui/state/bittensor"
import { useMemo } from "react"

import { type Metagraph, normalizeMetagraph, type SubnetNeuron } from "../utils/subnetNeurons"
import { useBittensorStakingPositions } from "./useBittensorStakingPositions"

export type { NeuronRole, SubnetNeuron } from "../utils/subnetNeurons"

/**
 * Fetches every neuron registered on a subnet (validators + miners + the owner hotkey) for the
 * conviction-lock hotkey picker. A conviction lock can target ANY registered hotkey, not just a
 * validator, so this reads the on-chain metagraph rather than the validators-only TaoData API.
 *
 * The raw chain fetch is account-independent (keyed on network/netuid only); the display name and
 * "you stake here" flag are enriched in memos so switching the selected account never refetches.
 */
export const useBittensorSubnetNeurons = (
  networkId: DotNetworkId | null | undefined,
  netuid: number | null | undefined,
  address?: string | null
) => {
  const {
    data: sapi,
    isLoading: isSapiLoading,
    isError: isSapiError,
    error: sapiError,
  } = useScaleApi(networkId)

  const { data: validatorsMap } = useBittensorValidatorsMap()
  const positions = useBittensorStakingPositions(networkId)

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
    placeholderData: keepPreviousData,
    persister: createQueryStoragePersister({ maxAge: 60 * 60 * 1000 }), // 1 hour
  })

  // hotkeys the selected account stakes to on this subnet (lowercased for membership tests)
  const youStakeHotkeys = useMemo(() => {
    const set = new Set<string>()
    if (!address || typeof netuid !== "number") return set
    for (const p of positions) {
      if (p.token.netuid === netuid && p.token.hotkey && isAddressEqual(p.account.address, address))
        set.add(p.token.hotkey.toLowerCase())
    }
    return set
  }, [positions, address, netuid])

  const neurons = useMemo<SubnetNeuron[]>(() => {
    const raw = query.data
    if (!raw) return []
    return raw.map(({ onChainName, ...n }) => ({
      ...n,
      name: onChainName ?? validatorsMap[n.hotkey]?.name ?? null,
      isYouStakeHere: youStakeHotkeys.has(n.hotkey.toLowerCase()),
    }))
  }, [query.data, validatorsMap, youStakeHotkeys])

  return {
    neurons,
    isLoading: isSapiLoading || query.isLoading,
    isError: isSapiError || query.isError,
    error: sapiError ?? query.error ?? null,
  }
}
