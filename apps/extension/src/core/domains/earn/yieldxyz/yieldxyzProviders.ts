import { YIELD_API_BASE_URL } from "@common/constants"
import { log } from "@common/log"
import { getLoadableQuery$, keepAlive, type Loadable } from "@talismn/util"
import { isEqual } from "lodash-es"
import {
  concatMap,
  defer,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  take,
  tap,
} from "rxjs"

import { updateYieldxyzProvidersStore, yieldxyzProvidersStore$ } from "./store.providers"
import type { YieldxyzProvider } from "./types"

const KEEP_ALIVE = 3_000
const REFRESH_INTERVAL = 5 * 60_000

const fetchYieldxyzProviders = async (signal?: AbortSignal) => {
  try {
    const req = await fetch(`${YIELD_API_BASE_URL}/talisman/providers`, {
      signal,
      cache: "no-cache",
    })
    if (!req.ok)
      throw new Error(`Failed to fetch yieldxyz providers: ${req.status} ${req.statusText}`)

    return req.json() as Promise<YieldxyzProvider[]>
  } catch (err) {
    log.error("Error fetching yieldxyz providers", err)
    throw err
  }
}

export const yieldxyzProviders$ = defer(() =>
  yieldxyzProvidersStore$.pipe(
    take(1),
    concatMap((defaultValue) =>
      getLoadableQuery$({
        namespace: "yieldxyzProviders$",
        args: [],
        queryFn: (_, signal) => fetchYieldxyzProviders(signal),
        refreshInterval: REFRESH_INTERVAL,
        defaultValue,
      }).pipe(
        map(
          (loadable): Loadable<YieldxyzProvider[]> =>
            loadable.status === "success" ? loadable : { status: "loading", data: defaultValue }
        ),
        startWith({
          status: "loading",
          data: defaultValue,
        } as Loadable<YieldxyzProvider[]>)
      )
    ),
    distinctUntilChanged<Loadable<YieldxyzProvider[]>>(isEqual),
    tap({
      next: (result) => {
        if (result.status === "success") updateYieldxyzProvidersStore(result.data)
      },
      subscribe: () => log.debug("[yield.xyz] starting yield providers subscription"),
      unsubscribe: () => log.debug("[yield.xyz] stopping yield providers subscription"),
    }),
    shareReplay({ refCount: true, bufferSize: 1 }),
    keepAlive(KEEP_ALIVE)
  )
)
