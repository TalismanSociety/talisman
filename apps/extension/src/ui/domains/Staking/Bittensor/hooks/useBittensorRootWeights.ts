import type { DotNetworkId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { ROOT_NETUID } from "../utils/constants"
import type { RootWeightEntry } from "../utils/rootWeights"

type StorageChanges = [{ changes: [key: string, value: string | null][] }]

const fetchDoubleMapEntries = async <T>(
  sapi: ScaleApi,
  entry: string,
  firstKey: number
): Promise<Map<number, T>> => {
  const { connector, builder } = sapi.chain
  const codec = builder.buildStorage("SubtensorModule", entry)

  const prefix = codec.keys.enc(firstKey)
  const keys = (await connector.send("state_getKeysPaged", [prefix, 1000, null])) as string[]
  if (!keys.length) return new Map()

  const [{ changes }] = (await connector.send("state_queryStorageAt", [keys])) as StorageChanges

  return new Map(
    changes
      .filter(([, value]) => value !== null)
      .map(([key, value]) => {
        const [, uid] = codec.keys.dec(key) as [number, number]
        return [uid, codec.value.dec(value as string) as T]
      })
  )
}

/**
 * Declared root weights of every root validator, keyed by hotkey: how each root-stake
 * fund allocates deposits across subnets. Swept from the `Weights` and `Keys` storage
 * maps in four RPC calls total, instead of one runtime API call per validator.
 * A missing hotkey means the validator never set weights (uncurated fund) — stakers
 * still earn, dividends accumulate in place following raw subnet emissions.
 */
const fetchRootWeightsByHotkey = async (sapi: ScaleApi) => {
  const [hotkeyByUid, weightsByUid] = await Promise.all([
    fetchDoubleMapEntries<string>(sapi, "Keys", ROOT_NETUID),
    fetchDoubleMapEntries<RootWeightEntry[]>(sapi, "Weights", ROOT_NETUID),
  ])

  const byHotkey: Record<string, RootWeightEntry[]> = {}
  for (const [uid, weights] of weightsByUid) {
    const hotkey = hotkeyByUid.get(uid)
    if (hotkey) byHotkey[hotkey] = weights
  }
  return byHotkey
}

export const useBittensorRootWeights = (networkId: DotNetworkId | undefined, hotkey: string) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useBittensorRootWeights", sapi?.id],
    queryFn: async () => {
      if (!sapi) throw new Error("Chain connection not ready")
      return fetchRootWeightsByHotkey(sapi)
    },
    enabled: !!sapi,
    staleTime: 5 * 60_000,
    select: (byHotkey) => byHotkey[hotkey] ?? [],
  })
}
