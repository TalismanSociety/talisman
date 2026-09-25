import { log } from "@common/log"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

const MEASURED_BLOCKS = 100
// an underestimate only makes block-time based refreshes more frequent
const FALLBACK_BLOCK_TIME_MS = 1_000
const MEASURE_RETRY_INTERVAL_MS = 60_000

/**
 * 2 × `Timestamp.MinimumPeriod`, the Aura and BABE convention. Null when the runtime sets it to
 * 0, as Asset Hubs do since elastic scaling.
 */
export const getRuntimeBlockTimeMs = (sapi: ScaleApi): number | null => {
  try {
    const minimumPeriod = Number(sapi.getConstant<bigint>("Timestamp", "MinimumPeriod"))
    return minimumPeriod > 0 ? minimumPeriod * 2 : null
  } catch {
    return null
  }
}

export const measureBlockTimeMs = async (sapi: ScaleApi): Promise<number> => {
  const head = await sapi.getStorage<number>("System", "Number", [])
  if (head <= MEASURED_BLOCKS + 1) throw new Error("Not enough blocks to measure block time")

  const [recentHash, pastHash] = await Promise.all([
    sapi.getStorage<string | null>("System", "BlockHash", [head - 1]),
    sapi.getStorage<string | null>("System", "BlockHash", [head - 1 - MEASURED_BLOCKS]),
  ])
  if (!recentHash || !pastHash) throw new Error("Block hash not found")

  const [recentTimestamp, pastTimestamp] = await Promise.all([
    sapi.getStorage<bigint>("Timestamp", "Now", [], recentHash),
    sapi.getStorage<bigint>("Timestamp", "Now", [], pastHash),
  ])
  const blockTimeMs = (Number(recentTimestamp) - Number(pastTimestamp)) / MEASURED_BLOCKS
  if (!(blockTimeMs > 0)) throw new Error("Invalid block timestamps")

  return blockTimeMs
}

/** Block time from the runtime constants, else measured over the last blocks */
export const useBlockTimeMs = (sapi: ScaleApi | null | undefined): number | null => {
  const runtimeBlockTimeMs = useMemo(() => (sapi ? getRuntimeBlockTimeMs(sapi) : null), [sapi])

  const { data: measured } = useQuery({
    queryKey: ["useBlockTimeMs", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null
      try {
        return { blockTimeMs: await measureBlockTimeMs(sapi), isFallback: false }
      } catch (err) {
        log.warn("Failed to measure block time", { chainId: sapi.chainId, err })
        return { blockTimeMs: FALLBACK_BLOCK_TIME_MS, isFallback: true }
      }
    },
    enabled: !!sapi && runtimeBlockTimeMs === null,
    staleTime: Number.POSITIVE_INFINITY,
    refetchInterval: (query) => (query.state.data?.isFallback ? MEASURE_RETRY_INTERVAL_MS : false),
  })

  return runtimeBlockTimeMs ?? measured?.blockTimeMs ?? null
}
