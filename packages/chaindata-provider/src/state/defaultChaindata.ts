import { liveQuery } from "dexie"
import { isEqual, isEqualWith, sortBy } from "lodash"
import { combineLatest, firstValueFrom, Observable, ReplaySubject, shareReplay } from "rxjs"
import z from "zod/v4"

import { NetworkSchema } from "../chaindata/networks"
import { TokenSchema } from "../chaindata/tokens"
import { githubChaindataDistUrl } from "../constants"
import log from "../log"
import { chaindataDb } from "./db"

const REFRESH_INTERVAL = 300_000 // 5 mins

export const CHAINDATA_CONSOLIDATED_URL = `${githubChaindataDistUrl}/chaindata.min.json`

const getFallbackUrl = (url: string) => {
  // if githack fails, try statically
  if (url.startsWith("https://raw.githubusercontent.com/"))
    return url.replace("https://raw.githubusercontent.com/", "https://cdn.statically.io/gh/")

  // can add more fallbacks here such as jsdelivr, unpkg, etc.

  return null
}

const fetchJsonFromGithubUrl = async <T>(
  url: string,
  schema?: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> => {
  const req = await fetch(url, { signal })

  if (!req.ok) {
    const fallbackUrl = getFallbackUrl(url)
    if (fallbackUrl) return fetchJsonFromGithubUrl(fallbackUrl, schema, signal)
    throw new Error(`Failed to fetch from ${url}: ${req.status} ${req.statusText}`)
  }

  const data = await req.json()

  if (schema) {
    const result = schema.safeParse(data)
    if (!result.success) log.warn("Failed to parse data from", url, { error: result.error, data })
    else return result.data as T
  }

  return data as T
}

const ConsolidatedChaindataSchema = z.object({
  networks: z.array(NetworkSchema),
  tokens: z.array(TokenSchema),
  miniMetadatas: z.array(z.any()),
})

export type Chaindata = z.infer<typeof ConsolidatedChaindataSchema>

const fetchChaindata = (signal: AbortSignal) =>
  fetchJsonFromGithubUrl(CHAINDATA_CONSOLIDATED_URL, ConsolidatedChaindataSchema, signal)

const result = new ReplaySubject<Chaindata>(1)

let lastUpdatedAt = 0

const dbChaindata$ = combineLatest({
  networks: liveQuery(() => chaindataDb.networks.toArray()),
  tokens: liveQuery(() => chaindataDb.tokens.toArray()),
  miniMetadatas: liveQuery(() => chaindataDb.miniMetadatas.toArray()),
}).pipe(shareReplay(1))

const ghChaindata$ = new Observable<Chaindata>((subscriber) => {
  const controller = new AbortController()

  const subscription = result.subscribe(subscriber)

  let timeout: ReturnType<typeof setTimeout> | null = null

  const refresh = async () => {
    try {
      const delay = Math.max(0, lastUpdatedAt + 60_000 - Date.now())
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      if (controller.signal.aborted) return

      log.debug("[defaultChaindata$] Refreshing chaindata from GitHub")
      const data = await fetchChaindata(controller.signal)
      lastUpdatedAt = Date.now()

      result.next(data)
    } catch (error) {
      log.error("Failed to fetch chaindata", error)
      if (!subscriber.closed) result.error(error)
    } finally {
      if (!controller.signal.aborted) timeout = setTimeout(refresh, REFRESH_INTERVAL)
    }
  }

  refresh()

  return () => {
    if (timeout) clearTimeout(timeout)
    subscription.unsubscribe()
    controller.abort()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

const shouldUpdateGhEntity = (cd1: Chaindata, cd2: Chaindata, key: keyof Chaindata) => {
  const sorted1 = sortBy(cd1[key], "id")
  const sorted2 = sortBy(cd2[key], "id")
  return !isEqualWith(sorted1, sorted2, isEqual)
}

export const defaultChaindata$ = new Observable<Chaindata>((subscriber) => {
  const subUpdateFromGithub = ghChaindata$.subscribe(async (ghData) => {
    const now = performance.now()
    try {
      const dbData = await firstValueFrom(dbChaindata$)

      // TODO consider adding a hash in chaindata.json and compare just that ?
      const updateNetworks = shouldUpdateGhEntity(ghData, dbData, "networks")
      const updateTokens = shouldUpdateGhEntity(ghData, dbData, "tokens")
      const updateMiniMetadata = shouldUpdateGhEntity(ghData, dbData, "miniMetadatas")

      if (!updateNetworks && !updateTokens && !updateMiniMetadata)
        return log.debug(`[defaultChaindata$] No db updates needed: ${performance.now() - now}ms`)

      // update local db if chaindata is found different from GH
      await chaindataDb.transaction("rw", ["networks", "tokens", "miniMetadatas"], async (ctx) => {
        if (updateNetworks) {
          log.debug("[defaultChaindata$] Updating networks in DB")
          await ctx.networks.clear()
          await ctx.networks.bulkAdd(ghData.networks)
        }
        if (updateTokens) {
          log.debug("[defaultChaindata$] Updating tokens in DB")
          await ctx.tokens.clear()
          await ctx.tokens.bulkAdd(ghData.tokens)
        }
        if (updateMiniMetadata) {
          log.debug("[defaultChaindata$] Updating miniMetadatas in DB")
          await ctx.miniMetadatas.clear()
          await ctx.miniMetadatas.bulkAdd(ghData.miniMetadatas)
        }
      })

      log.debug(`[defaultChaindata$] Db syncoronized with GitHub :${performance.now() - now}ms`)
    } catch (cause) {
      log.error("[defaultChaindata$] Failed to sync chaindata", { cause })
    }
  })

  const subOutput = dbChaindata$.subscribe(subscriber)

  return () => {
    subUpdateFromGithub.unsubscribe()
    subOutput.unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))
