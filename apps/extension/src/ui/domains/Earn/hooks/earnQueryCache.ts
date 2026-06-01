import { log } from "@common/log"
import type { Query, QueryFunctionContext, QueryKey } from "@tanstack/react-query"
import { notifyManager } from "@tanstack/react-query"
import { api } from "@ui/api/api"

const DEFAULT_MAX_AGE = 86_400_000 // 24 hours
const EARN_QUERY_CACHE_PREFIX = "earn"

type EarnQueryCacheScopePart = string | number | boolean | null | undefined

export type EarnQueryCacheKeyOptions = {
  providerId: string
  resource: string
  scope?: EarnQueryCacheScopePart | readonly EarnQueryCacheScopePart[]
}

export type EarnQueryCachePersisterConfig<TData, TPersisted = TData> = {
  key: string
  maxAge?: number
  serialize?: (data: TData) => TPersisted
  deserialize?: (data: TPersisted) => TData
}

const normalizeScopePart = (part: EarnQueryCacheScopePart) =>
  part == null ? null : encodeURIComponent(String(part).toLowerCase())

export const getEarnQueryCacheKey = ({ providerId, resource, scope }: EarnQueryCacheKeyOptions) => {
  const scopeParts = (Array.isArray(scope) ? scope : [scope]).map(normalizeScopePart)

  return [
    EARN_QUERY_CACHE_PREFIX,
    normalizeScopePart(providerId),
    normalizeScopePart(resource),
    ...scopeParts,
  ]
    .filter((part): part is string => !!part)
    .join(":")
}

export const removeEarnQueryCacheEntry = (key: string) => api.queryCacheRemove(key)

export function createEarnQueryCachePersister<TData, TPersisted = TData>({
  key,
  maxAge = DEFAULT_MAX_AGE,
  serialize = (data) => data as unknown as TPersisted,
  deserialize = (data) => data as unknown as TData,
}: EarnQueryCachePersisterConfig<TData, TPersisted>) {
  return async <TQueryKey extends QueryKey>(
    queryFn: (context: QueryFunctionContext<TQueryKey>) => TData | Promise<TData>,
    context: QueryFunctionContext<TQueryKey>,
    query: Query
  ): Promise<TData> => {
    if (query.state.data === undefined) {
      try {
        const cached = await api.queryCacheGet(key)
        if (cached) {
          const data = deserialize(cached.data as TPersisted)
          notifyManager.schedule(() => {
            query.setState({ dataUpdatedAt: cached.dataUpdatedAt })
            if (query.isStale()) query.fetch()
          })
          return data
        }
      } catch (err) {
        log.error("Error restoring earn query cache", { key, err })
        api
          .queryCacheRemove(key)
          .catch((removeErr) =>
            log.error("Error removing invalid earn query cache entry", { key, err: removeErr })
          )
      }
    }

    const data = await queryFn(context)

    notifyManager.schedule(() => {
      const purgeAt = Date.now() + maxAge
      const dataUpdatedAt = Math.max(query.state.dataUpdatedAt, Date.now())
      api
        .queryCacheSet(key, serialize(data), purgeAt, dataUpdatedAt)
        .catch((err) => log.error("Error writing earn query cache", { key, err }))
    })

    return data
  }
}
