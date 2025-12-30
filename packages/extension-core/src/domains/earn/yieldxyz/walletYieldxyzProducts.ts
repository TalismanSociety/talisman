import { parseTokenId, TokenId } from "@talismn/chaindata-provider"
import { getLoadableQuery$, isNotNil, keepAlive, Loadable } from "@talismn/util"
import { log, YIELD_API_BASE_URL } from "extension-shared"
import { isEqual, uniq } from "lodash-es"
import {
  combineLatest,
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
import { walletBalances$ } from "../../balances/walletBalances"
import { YieldDto } from "./exports"
import { getTalismanNetworkIdToYieldxyzNetworkIdMap } from "./helpers"
import { isSupportedYieldxyzProduct } from "./isSupportedYieldxyzProduct"
import { updateYieldxyzProductsStore, yieldxyzProductsStore$ } from "./store.products"

const REFRESH_INTERVAL = 30_000
const KEEP_ALIVE = 3_000

const ownedTokenIds$ = walletBalances$.pipe(
  map((balances) => uniq(balances.balances.map((b) => b.tokenId)).sort()),
  distinctUntilChanged<TokenId[]>(isEqual),
)

const yieldxyzNetworkIds$ = combineLatest([ownedTokenIds$, remoteConfigStore.observable]).pipe(
  map(([tokenIds, remoteConfig]) => {
    const toYieldxyzNetworkIdMap = getTalismanNetworkIdToYieldxyzNetworkIdMap(remoteConfig)

    return uniq(
      tokenIds
        .map((tokenId) => toYieldxyzNetworkIdMap[parseTokenId(tokenId).networkId])
        .filter(isNotNil),
    ).sort()
  }),
  distinctUntilChanged<string[]>(isEqual),
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
          }),
        ),
        tap((products) => {
          if (products.status === "success") updateYieldxyzProductsStore(products.data)
        }),
        map(
          (loadable): Loadable<YieldDto[]> =>
            loadable.status === "success" ? loadable : { status: "loading", data: defaultValue },
        ),
        startWith({
          status: "loading",
          data: defaultValue,
        } as Loadable<YieldDto[]>),
      ),
    ),
    distinctUntilChanged<Loadable<YieldDto[]>>(isEqual),
    tap({
      next: (val) => log.debug("[yield.xyz] yield products emitted", val),
      subscribe: () => log.debug("[yield.xyz] starting yield products subscription"),
      unsubscribe: () => log.debug("[yield.xyz] stopping yield products subscription"),
    }),
    shareReplay({ refCount: true, bufferSize: 1 }),
    keepAlive(KEEP_ALIVE),
  ),
)

export const refreshYieldxyzPosition = ({
  yieldId,
  address,
}: {
  yieldId: string
  address: string
}) => {
  log.log("Refreshing yield.xyz position", { yieldId, address })
}
