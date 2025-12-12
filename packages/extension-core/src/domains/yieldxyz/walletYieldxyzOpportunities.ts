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

import { remoteConfigStore } from "../app/store.remoteConfig"
import { walletBalances$ } from "../balances/walletBalances"
import { YieldDto } from "./exports"
import { getTalismanNetworkIdToYieldxyzNetworkIdMap } from "./helpers"
import {
  updateYieldxyzOpportunitiesStore,
  yieldxyzOpportunitiesStore$,
} from "./store.opportunities"

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

const fetchYieldxyzOpportunities = async (networks: string[], signal?: AbortSignal) => {
  if (!networks.length) return []

  try {
    const url = new URL(`/talisman/products`, YIELD_API_BASE_URL)
    url.searchParams.append("networks", networks.join(","))

    const req = await fetch(url.toString(), { signal })
    if (!req.ok)
      throw new Error(`Failed to fetch yieldxyz providers: ${req.status} ${req.statusText}`)

    return req.json() as Promise<YieldDto[]>
  } catch (err) {
    log.error("Error fetching yieldxyz opportunities", err)
    throw err
  }
}

export const walletYieldxyzOpportunities$ = defer(() =>
  yieldxyzOpportunitiesStore$.pipe(
    take(1),
    concatMap((defaultValue) =>
      yieldxyzNetworkIds$.pipe(
        switchMap((networks) =>
          getLoadableQuery$({
            namespace: "walletYieldxyzOpportunities$",
            args: networks,
            queryFn: (networks, signal) => fetchYieldxyzOpportunities(networks, signal),
            refreshInterval: REFRESH_INTERVAL,
            defaultValue,
          }),
        ),
        tap((opportunities) => {
          if (opportunities.status === "success")
            updateYieldxyzOpportunitiesStore(opportunities.data)
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
      next: (val) => log.debug("[yield.xyz] yield opportunities emitted", val),
      subscribe: () => log.debug("[yield.xyz] starting yield opportunities subscription"),
      unsubscribe: () => log.debug("[yield.xyz] stopping yield opportunities subscription"),
    }),
    shareReplay({ refCount: true, bufferSize: 1 }),
    keepAlive(KEEP_ALIVE),
  ),
)
