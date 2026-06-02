import type { Query, QueryFunctionContext, QueryKey } from "@tanstack/react-query"
import { hashKey, notifyManager } from "@tanstack/react-query"

import { api } from "../api/api"

/** Configuration for persisting a query to the background-owned query cache. */
export type QueryStorageConfig<TData = unknown, TPersisted = TData> = {
  /**
   * Storage key for this query. When omitted, automatically derived from
   * `queryKey` via TanStack's deterministic `hashKey`.
   */
  key?: string
  /**
   * Maximum age of the cached entry in milliseconds.
   * The entry will be purged from storage after this duration.
   * @default 86_400_000 (24 hours)
   */
  maxAge?: number
  /** Converts query data into JSON-safe persisted data. */
  serialize?: (data: TData) => TPersisted
  /** Restores persisted data back into the query data shape. */
  deserialize?: (data: TPersisted) => TData
}

const DEFAULT_MAX_AGE = 86_400_000 // 24 hours

export const PERSIST_AGE_ONE_YEAR = 1000 * 60 * 60 * 24 * 365

/**
 * Creates a TanStack Query per-query `persister` that reads/writes through
 * the background-script query cache API.
 *
 * Follows the same pattern as `@tanstack/query-persist-client-core`'s
 * `experimental_createQueryPersister`, adapted for Talisman's background-mediated
 * IndexedDB storage with compression.
 *
 * The persister wraps `queryFn`:
 *  1. On first fetch (no in-memory data), it tries to restore from background cache.
 *  2. If restored, data is returned immediately (no loading state) and a stale refetch
 *     is scheduled if the data is stale per TanStack's `staleTime`.
 *  3. After a successful `queryFn` execution, the result is persisted to background cache.
 *
 * Works with `useQuery`, `useSuspenseQuery`, and `prefetchQuery` via the
 * standard `persister` query option. TanStack automatically sets
 * `networkMode: 'offlineFirst'` when a persister is present.
 *
 * Usage:
 * ```ts
 * // Auto-derived key from queryKey (simplest)
 * useQuery({
 *   queryKey: ["sn45", "taoPrice"],
 *   queryFn: () => fetchTaoPrice(),
 *   persister: createQueryStoragePersister({ maxAge: 60_000 }),
 *   staleTime: 30_000,
 * })
 *
 * // Explicit key (when you need a stable key independent of queryKey)
 * useQuery({
 *   queryKey: ["sn45", "taoPrice", someVolatileParam],
 *   queryFn: () => fetchTaoPrice(),
 *   persister: createQueryStoragePersister({ key: "tao-price", maxAge: 60_000 }),
 *   staleTime: 30_000,
 * })
 * ```
 */
export function createQueryStoragePersister<TData = unknown, TPersisted = TData>(
  config?: QueryStorageConfig<TData, TPersisted>
) {
  const {
    key: explicitKey,
    maxAge = DEFAULT_MAX_AGE,
    serialize = (data) => data as unknown as TPersisted,
    deserialize = (data) => data as unknown as TData,
  } = config ?? {}

  return async <T, TQueryKey extends QueryKey>(
    queryFn: (context: QueryFunctionContext<TQueryKey>) => T | Promise<T>,
    context: QueryFunctionContext<TQueryKey>,
    query: Query
  ): Promise<T> => {
    const key = explicitKey ?? hashKey(context.queryKey)

    // Only attempt restore when no in-memory data exists
    if (query.state.data === undefined) {
      try {
        const cached = await api.queryCacheGet(key)
        if (cached) {
          const data = deserialize(cached.data as TPersisted)
          // Schedule a macro task to fix dataUpdatedAt and optionally refetch
          notifyManager.schedule(() => {
            query.setState({ dataUpdatedAt: cached.dataUpdatedAt })
            if (query.isStale()) query.fetch()
          })
          // Return immediately to avoid loading state
          return data as T
        }
      } catch {
        Promise.resolve(api.queryCacheRemove(key)).catch(() => {})
        // Cache miss or error — fall through to queryFn
      }
    }

    // No cached data or cache miss — run the real queryFn
    const data = await queryFn(context)

    // Persist after TanStack has updated internal state.
    // On successful revalidation we want a fresh persisted timestamp so maxAge
    // is reset from the new data point rather than the original cached write.
    notifyManager.schedule(() => {
      const purgeAt = Date.now() + maxAge
      const dataUpdatedAt = Math.max(query.state.dataUpdatedAt, Date.now())
      api.queryCacheSet(key, serialize(data as TData), purgeAt, dataUpdatedAt).catch(() => {})
    })

    return data
  }
}
