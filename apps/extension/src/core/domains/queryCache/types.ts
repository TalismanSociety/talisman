export interface QueryCacheMessages {
  "pri(queryCache.get)": [RequestQueryCacheGet, ResponseQueryCacheGet]
  "pri(queryCache.set)": [RequestQueryCacheSet, boolean]
  "pri(queryCache.remove)": [RequestQueryCacheRemove, boolean]
}

export type RequestQueryCacheGet = { key: string }
export type ResponseQueryCacheGet = { data: unknown; dataUpdatedAt: number } | null

export type RequestQueryCacheSet = {
  key: string
  data: unknown
  purgeAt: number
  dataUpdatedAt: number
}

export type RequestQueryCacheRemove = { key: string }
