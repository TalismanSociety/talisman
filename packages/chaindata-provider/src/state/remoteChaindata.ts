import { isAbortError } from "@talismn/util"
import { Observable, shareReplay } from "rxjs"

import log from "../log"
import { fetchChaindata } from "./net"
import type { Chaindata } from "./schema"

const REFRESH_INTERVAL = 300_000 // 5 mins
const MIN_REFRESH_INTERVAL = 60_000

const remoteChaindataByUrl = new Map<string, Observable<Chaindata>>()

/**
 * Downloads the chaindata file at `url` and refreshes it every 5 minutes. Equivalent spellings
 * of a url share one observable. Throws if `url` is not a valid url.
 *
 * Emitted objects are shared and already validated: treat them as immutable, and filter them
 * by returning new objects.
 */
export const getRemoteChaindata$ = (url: string) => {
  const href = parseChaindataUrl(url)
  const existing = remoteChaindataByUrl.get(href)
  if (existing) return existing

  const remoteChaindata$ = createRemoteChaindata$(href)
  remoteChaindataByUrl.set(href, remoteChaindata$)
  return remoteChaindata$
}

const parseChaindataUrl = (url: string) => {
  try {
    return new URL(url).href
  } catch (cause) {
    throw new Error(`Invalid chaindata url: "${url}"`, { cause })
  }
}

const createRemoteChaindata$ = (url: string) => {
  let lastUpdatedAt = 0
  // a subscriber arriving within MIN_REFRESH_INTERVAL of a download would otherwise wait it out with no data
  let recentData: Chaindata | null = null

  return new Observable<Chaindata>((subscriber) => {
    if (recentData) subscriber.next(recentData)

    const controller = new AbortController()
    subscriber.add(() => controller.abort())

    let timeout: ReturnType<typeof setTimeout> | null = null
    subscriber.add(() => timeout && clearTimeout(timeout))

    const refresh = async () => {
      try {
        const delay = Math.max(0, lastUpdatedAt + MIN_REFRESH_INTERVAL - Date.now())
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
        if (controller.signal.aborted) return

        log.debug("[remoteChaindata$] Refreshing chaindata from", url)
        const data = await fetchChaindata(url, controller.signal)
        lastUpdatedAt = Date.now()
        recentData = data
        setTimeout(() => {
          if (recentData === data) recentData = null
        }, MIN_REFRESH_INTERVAL)

        // data is already validated by fetchChaindata (net.ts)
        subscriber.next(data)
      } catch (error) {
        if (isAbortError(error)) return

        log.error("Failed to fetch chaindata", error)
        if (!subscriber.closed) subscriber.error(error)
      } finally {
        if (!controller.signal.aborted) timeout = setTimeout(refresh, REFRESH_INTERVAL)
      }
    }
    refresh()
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }))
}
