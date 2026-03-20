import { state, useStateObservable } from "@react-rxjs/core"
import {
  concatMap,
  firstValueFrom,
  type Observable,
  of,
  ReplaySubject,
  Subject,
  switchMap,
  tap,
} from "rxjs"

import { type LifiStatus, swapStatus$ as lifiStatus$ } from "../swap-modules/lifi-swap-module"
import {
  type SimpleswapExchange,
  swapStatus$ as simpleswapStatus$,
} from "../swap-modules/simpleswap-swap-module"
import {
  type StealthexExchange,
  swapStatus$ as stealthexStatus$,
} from "../swap-modules/stealthex-swap-module"

type SwapStatus = SimpleswapExchange["status"] | StealthexExchange["status"] | LifiStatus

/**
 * // TODO this uses local storage and global observables, needs to be refactored
 */

export const useSwapStatus = (protocol?: string, id?: string): SwapStatus | undefined => {
  const protocolAndId = protocol && id && `${protocol}::${id}`
  return useStateObservable(getSwapStatus$(protocolAndId))
}

export const getSwapStatus$ = state(
  (protocolAndId?: string): Observable<SwapStatus | undefined> => {
    if (!protocolAndId) return of(undefined)

    return completedSwapsCache$.pipe(
      switchMap((cache) => {
        // if value is cached, return it from the cache
        if (cache[protocolAndId]) return of(cache[protocolAndId])

        // otherwise fetch it from the api
        return getStatus$(protocolAndId).pipe(
          tap((status) => {
            // don't update cache if status isn't one of these
            if (
              status !== "failed" &&
              status !== "finished" &&
              status !== "expired" &&
              status !== "invalid" &&
              status !== "refunded"
            )
              return

            // update cache with latest value
            // this will prevent further api requests for this swap
            cacheSwapStatus$.next({ protocolAndId, status })
          })
        )
      })
    )
  }
)

const getStatus$ = state((protocolAndId: string): Observable<SwapStatus | undefined> => {
  // Split on the first "::" only — the remainder may contain chain IDs (e.g. "txHash::fromChain::toChain")
  const sepIdx = protocolAndId.indexOf("::")
  const protocol = protocolAndId.slice(0, sepIdx)
  const id = protocolAndId.slice(sepIdx + 2)
  const swapStatus$ = (() => {
    if (protocol === "swap-simpleswap") return simpleswapStatus$
    if (protocol === "swap-stealthex") return stealthexStatus$
    if (protocol === "swap-lifi") return lifiStatus$
    return
  })()
  if (!swapStatus$) return of(undefined)

  return swapStatus$(id)
})

type CachedSwapStatus = "finished" | "failed" | "expired" | "invalid" | "refunded"
const completedSwapsCacheKey = "TalismanCompletedSwapsCache"
const completedSwapsCache$ = new ReplaySubject<Record<string, CachedSwapStatus>>(1)

// load cache from localstorage on startup
completedSwapsCache$.next(JSON.parse(localStorage.getItem(completedSwapsCacheKey) ?? "{}"))

// save cache changes to localstorage
completedSwapsCache$.subscribe((cache) => {
  try {
    localStorage.setItem(completedSwapsCacheKey, JSON.stringify(cache ?? {}))
  } catch {
    // localStorage may be full — silently ignore
  }
})

// cacheSwapStatus$ makes sure that there's no race condition when saving new swap statuses to the cache.
// it prevents this specific timing issue:
// 1. swap1 reads cache
// 2. swap2 reads cache
// 3. swap1 stores new cached value
// 4. swap2 stores new cached value (deleting swap1's cached value)
//
// instead, each new cached value is emitted from the cacheSwapStatus$ subject and processed in sequence using concatMap, like a queue.
const MAX_CACHED_SWAPS = 100
const cacheSwapStatus$ = new Subject<{ protocolAndId: string; status: CachedSwapStatus }>()
cacheSwapStatus$
  .pipe(
    // save each new value in sequence, to prevent race conditions
    concatMap((newValue) =>
      firstValueFrom(completedSwapsCache$).then((cache) => {
        cache[newValue.protocolAndId] = newValue.status

        // evict oldest entries if cache exceeds limit
        const keys = Object.keys(cache)
        if (keys.length > MAX_CACHED_SWAPS) {
          for (const key of keys.slice(0, keys.length - MAX_CACHED_SWAPS)) {
            delete cache[key]
          }
        }

        return completedSwapsCache$.next(cache)
      })
    )
  )
  .subscribe()
