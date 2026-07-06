import {
  decAnyMetadata,
  getDynamicBuilder,
  getLookupFn,
  type ScaleStorageCoder,
  unifyMetadata,
} from "@talismn/scale"

import log from "../../log"
import type { MiniMetadata } from "../../types"

type ScaleBuilder = ReturnType<typeof getDynamicBuilder>

/**
 * Parsing chain metadata and building the dynamic scale builder
 * (unifyMetadata(decAnyMetadata(data)) + getDynamicBuilder(getLookupFn(...))) costs tens to
 * hundreds of ms and is a single indivisible synchronous call — it cannot be time-sliced.
 * Without caching it runs on EVERY balance subscription rebuild (i.e. every block for
 * substrate-native's nompool queries), which is the single largest JS-thread hog in this
 * package. With caching it runs once per (module, chain, specVersion).
 *
 * miniMetadata.id already hashes (source, chainId, specVersion); data.length is included in
 * the key as a cheap guard against config-driven content changes that don't bump the id.
 */
const getCacheKey = (miniMetadata: MiniMetadata): string | null =>
  miniMetadata.data ? `${miniMetadata.id}:${miniMetadata.data.length}` : null

const BUILDER_CACHE_SIZE = 16
const builderCache = new Map<string, ScaleBuilder | null>()

/** Returns the (memoized) dynamic scale builder for a miniMetadata, or null if it can't be built */
export const getCachedScaleBuilder = (miniMetadata: MiniMetadata): ScaleBuilder | null => {
  const key = getCacheKey(miniMetadata)
  if (key === null) return null

  if (builderCache.has(key)) {
    const cached = builderCache.get(key) ?? null
    // refresh LRU recency (Map preserves insertion order)
    builderCache.delete(key)
    builderCache.set(key, cached)
    return cached
  }

  let builder: ScaleBuilder | null = null
  try {
    // data is non-null here: getCacheKey returned a key
    const metadata = unifyMetadata(decAnyMetadata(miniMetadata.data!))
    builder = getDynamicBuilder(getLookupFn(metadata))
  } catch (cause) {
    // cache failures too, so a broken miniMetadata doesn't re-parse on every call
    log.error(`Failed to build scale builder for chain ${miniMetadata.chainId}`, cause)
  }

  builderCache.set(key, builder)
  while (builderCache.size > BUILDER_CACHE_SIZE)
    builderCache.delete(builderCache.keys().next().value as string)

  return builder
}

const STORAGE_CODER_CACHE_SIZE = 256
const storageCoderCache = new Map<string, ScaleStorageCoder | undefined>()

/** Returns the (memoized) storage coder for a (miniMetadata, pallet, entry), or undefined if it can't be built */
export const getCachedStorageCoder = (
  miniMetadata: MiniMetadata,
  pallet: string,
  entry: string
): ScaleStorageCoder | undefined => {
  const metadataKey = getCacheKey(miniMetadata)
  if (metadataKey === null) return undefined
  const key = `${metadataKey}:${pallet}:${entry}`

  if (storageCoderCache.has(key)) {
    const cached = storageCoderCache.get(key)
    storageCoderCache.delete(key)
    storageCoderCache.set(key, cached)
    return cached
  }

  let coder: ScaleStorageCoder | undefined
  try {
    coder = getCachedScaleBuilder(miniMetadata)?.buildStorage(pallet, entry)
  } catch (cause) {
    // cache failures too (some chains simply don't have the pallet/entry)
    log.trace(
      `Failed to build SCALE coder for chain ${miniMetadata.chainId} (${pallet}::${entry})`,
      cause
    )
  }

  storageCoderCache.set(key, coder)
  while (storageCoderCache.size > STORAGE_CODER_CACHE_SIZE)
    storageCoderCache.delete(storageCoderCache.keys().next().value as string)

  return coder
}
