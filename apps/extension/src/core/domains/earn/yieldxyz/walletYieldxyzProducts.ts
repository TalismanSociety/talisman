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
  switchMap,
  take,
  tap,
} from "rxjs"

import { remoteConfigStore } from "../../app/store.remoteConfig"
import { getYieldxyzNetworkIdToTalismanNetworkIdMap } from "./helpers"
import { isSupportedYieldxyzProduct } from "./isSupportedYieldxyzProduct"
import { updateYieldxyzProductsStore, yieldxyzProductsStore$ } from "./store.products"
import type { YieldDto } from "./types"

const REFRESH_INTERVAL = 30_000
const KEEP_ALIVE = 3_000

const yieldxyzNetworkIds$ = remoteConfigStore.observable.pipe(
  map((remoteConfig) => {
    const yieldxyzToTalismanMap = getYieldxyzNetworkIdToTalismanNetworkIdMap(remoteConfig)
    return Object.keys(yieldxyzToTalismanMap).sort()
  }),
  distinctUntilChanged<string[]>(isEqual)
)

const fetchYieldxyzProducts = async (networks: string[], signal?: AbortSignal) => {
  if (!networks.length) return []

  try {
    const url = new URL(`/talisman/products`, YIELD_API_BASE_URL)
    url.searchParams.append("networks", networks.join(","))

    const req = await fetch(url.toString(), { signal })
    if (!req.ok)
      throw new Error(`Failed to fetch yieldxyz products: ${req.status} ${req.statusText}`)

    const products = (await req.json()) as YieldDto[]

    return products.filter(isSupportedYieldxyzProduct)
  } catch (err) {
    log.error("Error fetching yieldxyz products", err)
    throw err
  }
}

export const walletYieldxyzProducts$ = defer(() =>
  yieldxyzProductsStore$.pipe(
    take(1),
    concatMap((defaultValue) =>
      yieldxyzNetworkIds$.pipe(
        switchMap((networks) =>
          getLoadableQuery$({
            namespace: "walletYieldxyzProducts$",
            args: networks,
            queryFn: (networks, signal) => fetchYieldxyzProducts(networks, signal),
            refreshInterval: REFRESH_INTERVAL,
            defaultValue,
          })
        ),
        tap((products) => {
          if (products.status === "success") updateYieldxyzProductsStore(products.data)
        }),
        map(
          (loadable): Loadable<YieldDto[]> =>
            loadable.status === "success" ? loadable : { status: "loading", data: defaultValue }
        ),
        startWith({
          status: "loading",
          data: defaultValue,
        } as Loadable<YieldDto[]>)
      )
    ),
    distinctUntilChanged<Loadable<YieldDto[]>>(isEqual),
    tap({
      next: (val) => log.debug("[yield.xyz] yield products emitted", val),
      subscribe: () => log.debug("[yield.xyz] starting yield products subscription"),
      unsubscribe: () => log.debug("[yield.xyz] stopping yield products subscription"),
    }),
    shareReplay({ refCount: true, bufferSize: 1 }),
    keepAlive(KEEP_ALIVE)
  )
)
