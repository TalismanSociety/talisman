import { api } from "@ui/api/api"
import { createQueryStoragePersister } from "@ui/hooks/queryStoragePersister"

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

export const createEarnQueryCachePersister = <TData, TPersisted = TData>({
  maxAge = DEFAULT_MAX_AGE,
  ...config
}: EarnQueryCachePersisterConfig<TData, TPersisted>) =>
  createQueryStoragePersister<TData, TPersisted>({
    ...config,
    maxAge,
  })
