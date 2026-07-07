import { parseMetadataRpc } from "@talismn/scale"
import { reportJsActivity } from "@talismn/util"

/**
 * parseMetadataRpc does a full metadata decode + dynamic-builder build (tens to hundreds
 * of ms, indivisible). Modules that poll (e.g. substrate-dtao every 6s) call it with the
 * same metadata hex over and over — memoize by the hex string so it runs once per
 * metadata blob instead of several times per poll tick.
 */
const CACHE_SIZE = 8
const cache = new Map<string, ReturnType<typeof parseMetadataRpc>>()

export const parseMetadataRpcCached = (
  metadataRpc: `0x${string}`
): ReturnType<typeof parseMetadataRpc> => {
  const cached = cache.get(metadataRpc)
  if (cached) {
    // refresh LRU recency (Map preserves insertion order)
    cache.delete(metadataRpc)
    cache.set(metadataRpc, cached)
    return cached
  }

  // cache misses are a prime JS-thread stall suspect: the parse is indivisible, and with
  // more than CACHE_SIZE distinct metadata blobs live the LRU thrashes and re-parses on
  // every rotation — report each miss (with duration + cache pressure) to the host
  // watchdog so stalls can be attributed to it
  const start = performance.now()
  const result = parseMetadataRpc(metadataRpc)
  reportJsActivity(
    `parseMetadataRpc miss (~${Math.round(metadataRpc.length / 2048)}KB, cache ${cache.size}/${CACHE_SIZE})`,
    performance.now() - start
  )

  cache.set(metadataRpc, result)
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string)

  return result
}
