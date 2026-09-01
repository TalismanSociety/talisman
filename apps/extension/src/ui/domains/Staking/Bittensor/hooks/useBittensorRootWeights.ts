import type { DotNetworkId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { ROOT_NETUID } from "../utils/constants"
import { getDeployableWeights, type RootWeightEntry } from "../utils/rootWeights"

type StorageChanges = [{ changes: [key: string, value: string | null][] }]

const fetchStorageEntries = async (
  sapi: ScaleApi,
  entry: string,
  ...keyArgs: number[]
): Promise<[key: number[], value: unknown][]> => {
  const { connector, builder } = sapi.chain
  const codec = builder.buildStorage("SubtensorModule", entry)

  const prefix = codec.keys.enc(...keyArgs)
  const keys = (await connector.send("state_getKeysPaged", [prefix, 1000, null])) as string[]
  if (!keys.length) return []

  const [{ changes }] = (await connector.send("state_queryStorageAt", [keys])) as StorageChanges

  return changes
    .filter(([, value]) => value !== null)
    .map(([key, value]) => [codec.keys.dec(key) as number[], codec.value.dec(value as string)])
}

const fetchDoubleMapEntries = async <T>(
  sapi: ScaleApi,
  entry: string,
  firstKey: number
): Promise<Map<number, T>> => {
  const entries = await fetchStorageEntries(sapi, entry, firstKey)
  return new Map(entries.map(([[, uid], value]) => [uid, value as T]))
}

const fetchExistingNetuids = async (sapi: ScaleApi): Promise<Set<number>> => {
  const entries = await fetchStorageEntries(sapi, "NetworksAdded")
  return new Set(entries.filter(([, added]) => added === true).map(([[netuid]]) => netuid))
}

/**
 * Declared root weights of every root validator, keyed by hotkey: how each root-stake
 * fund allocates deposits across subnets. Swept from the `Weights`, `Keys` and
 * `NetworksAdded` storage maps in six RPC calls total, instead of one runtime API call
 * per validator. Weights targeting removed subnets are dropped, matching the runtime's
 * deployable basket. A missing hotkey means the validator never set weights (uncurated
 * fund) — stakers still earn, dividends accumulate in place following raw subnet emissions.
 */
const fetchRootWeightsByHotkey = async (sapi: ScaleApi) => {
  const [hotkeyByUid, weightsByUid, existingNetuids] = await Promise.all([
    fetchDoubleMapEntries<string>(sapi, "Keys", ROOT_NETUID),
    fetchDoubleMapEntries<RootWeightEntry[]>(sapi, "Weights", ROOT_NETUID),
    fetchExistingNetuids(sapi),
  ])

  const byHotkey: Record<string, RootWeightEntry[]> = {}
  for (const [uid, weights] of weightsByUid) {
    const hotkey = hotkeyByUid.get(uid)
    if (hotkey) byHotkey[hotkey] = getDeployableWeights(weights, existingNetuids)
  }
  return byHotkey
}

export const useBittensorRootWeights = (networkId: DotNetworkId | undefined, hotkey: string) => {
  const { data: sapi, isPending: isSapiPending, isError: isSapiError } = useScaleApi(networkId)

  const query = useQuery({
    queryKey: ["useBittensorRootWeights", sapi?.id],
    queryFn: async () => {
      if (!sapi) throw new Error("Chain connection not ready")
      return fetchRootWeightsByHotkey(sapi)
    },
    enabled: !!sapi,
    staleTime: 5 * 60_000,
    select: (byHotkey) => byHotkey[hotkey] ?? [],
  })

  // useScaleApi resolving to null (metadata unavailable) leaves the weights query
  // disabled forever: surface it as an error, not as an endless loading state
  const isSapiUnavailable = isSapiError || (!isSapiPending && !sapi)

  return {
    data: query.data,
    isError: isSapiUnavailable || query.isError,
    isLoading: !isSapiUnavailable && !query.isError && query.isPending,
  }
}
