import { db } from "@core/db/db"
import type { ImageCacheEntry } from "@core/db/imageCache"
import { isSafeImageUrl } from "@core/domains/ethereum/helpers"
import { useEffect, useSyncExternalStore } from "react"

const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ENTRIES = 500
const MAX_BLOB_BYTES = 100_000

// In-memory cache — source of truth for synchronous reads
const cache = new Map<string, ImageCacheEntry>()

// useSyncExternalStore subscribers
const listeners = new Set<() => void>()

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

const emitChange = () => {
  for (const cb of listeners) cb()
}

// Hydrate: load Dexie entries into memory, but never overwrite fresher in-memory data
const hydratePromise = (async () => {
  try {
    const entries = await db.imageCache.toArray()
    for (const entry of entries) {
      const existing = cache.get(entry.url)
      if (!existing || existing.fetchedAt < entry.fetchedAt) cache.set(entry.url, entry)
    }
  } catch {
    // DB unavailable — empty cache is fine
  }
  emitChange()
})()

// Dedup in-flight fetches; maps url → AbortController for cancellation
const pending = new Map<string, AbortController>()

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

const fetchAndCache = (url: string) => {
  if (!isSafeImageUrl(url)) return
  if (pending.has(url)) return

  const controller = new AbortController()
  pending.set(url, controller)

  fetch(url, { signal: controller.signal })
    .then(async (res) => {
      if (!res.ok) return

      const blob = await res.blob()
      if (!blob.type.startsWith("image/")) return
      if (blob.size > MAX_BLOB_BYTES) return

      const dataUrl = await blobToDataUrl(blob)
      const entry: ImageCacheEntry = { url, dataUrl, fetchedAt: Date.now() }
      cache.set(url, entry)
      emitChange()

      await db.imageCache.put(entry).catch(() => {})
      evictIfNeeded()
    })
    .catch(() => {})
    .finally(() => pending.delete(url))
}

/** Cancel an in-flight fetch (e.g. when the requesting component unmounts) */
const cancelFetch = (url: string) => {
  const controller = pending.get(url)
  if (controller) {
    controller.abort()
    pending.delete(url)
  }
}

const evictIfNeeded = async () => {
  if (cache.size <= MAX_ENTRIES) return

  const sorted = [...cache.entries()].sort(([, a], [, b]) => a.fetchedAt - b.fetchedAt)
  const toRemove = sorted.slice(0, cache.size - MAX_ENTRIES)
  const urls = toRemove.map(([url]) => url)

  for (const url of urls) cache.delete(url)
  await db.imageCache.bulkDelete(urls).catch(() => {})
  emitChange()
}

/** @knipignore — used internally by useImageSwr; exported for tests */
export const ensureCached = async (url: string) => {
  await hydratePromise
  const entry = cache.get(url)
  if (!entry) fetchAndCache(url)
  else if (Date.now() - entry.fetchedAt > STALE_AFTER_MS) fetchAndCache(url)
}

/** Removes a URL from the in-memory + Dexie cache (e.g. when the cached image is broken) */
export const invalidateCachedImage = (url: string) => {
  cache.delete(url)
  db.imageCache.delete(url).catch(() => {})
  emitChange()
}

export const getCachedUrl = (url: string): string | null => cache.get(url)?.dataUrl ?? null

/**
 * SWR image cache hook. Returns a cached data-URL if available, or null.
 * Triggers background fetch on cache miss and revalidation when stale.
 */
export const useImageSwr = (url: string | null | undefined): string | null => {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (url ? getCachedUrl(url) : null),
    () => (url ? getCachedUrl(url) : null)
  )

  useEffect(() => {
    if (!url) return
    ensureCached(url)
    return () => cancelFetch(url)
  }, [url])

  return snapshot
}
