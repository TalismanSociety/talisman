import { Observable, ReplaySubject, shareReplay } from "rxjs"
import z from "zod/v4"

import { githubChaindataDistUrl } from "../constants"
import log from "../log"
import { NetworkSchema } from "./networks"
import { TokenSchema } from "./tokens"

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

export const ghChainData$ = new Observable<Chaindata>((subscriber) => {
  const controller = new AbortController()

  const subscription = result.subscribe(subscriber)

  let timeout: ReturnType<typeof setTimeout> | null = null

  const refresh = async () => {
    try {
      const delay = Math.max(0, lastUpdatedAt + 60_000 - Date.now())
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      if (controller.signal.aborted) return

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
