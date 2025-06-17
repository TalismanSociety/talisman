import { liveQuery } from "dexie"
import { isEqual } from "lodash"
import { combineLatest, Observable, ReplaySubject, shareReplay } from "rxjs"
import z from "zod/v4"

import { NetworkSchema } from "../chaindata/networks"
import { TokenSchema } from "../chaindata/tokens"
import { githubChaindataDistUrl } from "../constants"
import log from "../log"
import { chaindataDb } from "./db"

const REFRESH_INTERVAL = 300_000 // 5 mins

export const CHAINDATA_CONSOLIDATED_URL = `${githubChaindataDistUrl}/chaindata.json`

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

export const defaultChaindata$ = new Observable<Chaindata>((subscriber) => {
  const subUpdateFromGithub = combineLatest([ghChaindata$, dbChaindata$]).subscribe(
    async ([
      { networks: ghNetworks, tokens: ghTokens, miniMetadatas: ghMiniMetadatas },
      { networks: dbNetworks, tokens: dbTokens, miniMetadatas: dbMiniMetadatas },
    ]) => {
      const updateNetworks = !isEqual(ghNetworks, dbNetworks)
      const updateTokens = !isEqual(ghTokens, dbTokens)
      const updateMiniMetadata = !isEqual(ghMiniMetadatas, dbMiniMetadatas)

      if (!updateNetworks && !updateTokens && !updateMiniMetadata)
        return log.debug("[defaultChaindata$] No updates needed")

      try {
        await chaindataDb.transaction(
          "rw",
          chaindataDb.networks,
          chaindataDb.tokens,
          chaindataDb.miniMetadatas,
          async () => {
            if (updateNetworks) {
              log.debug("[defaultChaindata$] Updating networks in DB")
              await chaindataDb.networks.clear()
              await chaindataDb.networks.bulkAdd(ghNetworks)
            }
            if (updateTokens) {
              log.debug("[defaultChaindata$] Updating tokens in DB")
              await chaindataDb.tokens.clear()
              await chaindataDb.tokens.bulkAdd(ghTokens)
            }
            if (updateMiniMetadata) {
              log.debug("[defaultChaindata$] Updating miniMetadatas in DB")
              await chaindataDb.miniMetadatas.clear()
              await chaindataDb.miniMetadatas.bulkAdd(ghMiniMetadatas)
            }
          },
        )
      } catch (cause) {
        log.error("[defaultChaindata$] Failed to update chaindata", { cause })
      }
    },
  )

  const subOutput = dbChaindata$.subscribe(subscriber)

  return () => {
    subUpdateFromGithub.unsubscribe()
    subOutput.unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))
