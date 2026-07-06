import { parseMetadataRpc } from "@talismn/scale"

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

  const result = parseMetadataRpc(metadataRpc)
  cache.set(metadataRpc, result)
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string)

  return result
}
