import { NetworkId } from "@talismn/chaindata-provider"
import { getLoadableQuery$, isNotNil, keepAlive, Loadable } from "@talismn/util"
import { log } from "extension-shared"
import { chunk, isEqual, uniq } from "lodash-es"
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
import { RemoteConfigStoreData } from "../app/types"
import { walletBalances$ } from "../balances/walletBalances"
import { yieldSdk } from "./exports" // TODO fix circular dependency
import { getYieldxyzProduct } from "./getYieldxyzProduct"
import {
  getTalismanNetworkIdToYieldxyzNetworkIdMap,
  getYieldxyzNetworkIdToTalismanNetworkIdMap,
} from "./helpers"
import { updateYieldxyzPositionsStore, yieldxyzPositionsStore$ } from "./store.positions"
import { YieldDto, YieldxyzPosition } from "./types"
import { walletYieldxyzProducts$ } from "./walletYieldxyzProducts"

const REFRESH_INTERVAL = 30_000 // TODO push to 60s before release
const BATCH_SIZE = 50
const KEEP_ALIVE = 3_000

type PositionsQuery = {
  address: string
  networkId: NetworkId
}

// Fetch a single batch of queries with shared product caching
const fetchPositionsBatch = async (
  rawQueries: PositionsQuery[],
  remoteConfig: RemoteConfigStoreData,
  products: YieldDto[] | undefined,
  signal: AbortSignal,
): Promise<YieldxyzPosition[]> => {
  const toYieldyxzNetworksIdMap = getTalismanNetworkIdToYieldxyzNetworkIdMap(remoteConfig)
  const toTalismanNetworksIdMap = getYieldxyzNetworkIdToTalismanNetworkIdMap(remoteConfig)

  // Only send yield.xyz-shaped queries to the SDK
  const queries = rawQueries
    .map(({ address, networkId }) => ({
      address,
      network: toYieldyxzNetworksIdMap[networkId],
    }))
    .filter((q) => !!q.network)

  const result = await yieldSdk.getAggregateBalances({ queries })
  if (result.errors) log.warn("[Yield.xyz] getAggregateBalances returned errors", result.errors)

  const positions = await Promise.all(
    result.items.map(async (item) => {
      // a position must be mono-account
      if (uniq(item.balances.map((b) => b.address)).length !== 1) return null

      // a position must be mono-network
      if (uniq(item.balances.map((b) => b.token.network)).length !== 1) return null

      // network must be known by Talisman
      const address = item.balances[0].address
      const networkId = toTalismanNetworksIdMap[item.balances[0].token.network]
      if (!networkId) return null

      // associated product must exist
      const product =
        products?.find((p) => p.id === item.yieldId) ??
        (await getYieldxyzProduct(item.yieldId, signal))
      if (!product) return null

      return {
        address,
        networkId,
        ...item,
        product,
      }
    }),
  )

  return positions.filter(isNotNil)
}

// Main function that handles batching and parallel execution
const fetchPositions = async (
  queries: PositionsQuery[],
  remoteConfig: RemoteConfigStoreData,
  products: YieldDto[] | undefined,
  signal: AbortSignal,
): Promise<YieldxyzPosition[]> => {
  try {
    const batches = chunk(queries, BATCH_SIZE)

    const results = await Promise.all(
      batches.map((batch) => fetchPositionsBatch(batch, remoteConfig, products, signal)),
    )

    return results.flat()
  } catch (err) {
    log.error("[yield.xyz] fetchPositions error", { err })
    throw err
  }
}

const walletYieldxyzQueries$ = combineLatest([walletBalances$, remoteConfigStore.observable]).pipe(
  map(([balances, remoteConfig]) => {
    const toYieldyxzNetworksIdMap = getTalismanNetworkIdToYieldxyzNetworkIdMap(remoteConfig)
    return uniq(
      balances.balances
        .filter((b) => !!toYieldyxzNetworksIdMap[b.networkId])
        .map((b) => `${b.address}::${b.networkId}`),
    )
      .sort()
      .map((serialized): PositionsQuery => {
        const [address, networkId] = serialized.split("::") as [string, NetworkId]
        return { address, networkId }
      })
  }),
  distinctUntilChanged<PositionsQuery[]>(isEqual),
  shareReplay({ refCount: true, bufferSize: 1 }),
  tap({
    next: (queries) =>
      log.debug("[yield.xyz] walletYieldxyzQueries$ updated", {
        queriesCount: queries.length,
        queries,
      }),
  }),
)

export const walletYieldxyzPositions$ = defer(() =>
  yieldxyzPositionsStore$.pipe(
    take(1),
    concatMap((defaultValue) =>
      combineLatest([
        walletYieldxyzQueries$,
        remoteConfigStore.observable,
        walletYieldxyzProducts$,
      ]).pipe(
        switchMap(([queries, remoteConfig, { data: products }]) =>
          getLoadableQuery$({
            namespace: "walletYieldPositions$",
            args: [queries, remoteConfig] as const,
            queryFn: ([qs, rc], signal) => fetchPositions(qs, rc, products, signal),
            refreshInterval: REFRESH_INTERVAL,
            defaultValue,
          }),
        ),
        tap((positions) => {
          if (positions.status === "success") updateYieldxyzPositionsStore(positions.data)
        }),
        map(
          (loadable): Loadable<YieldxyzPosition[]> =>
            loadable.status === "success" ? loadable : { status: "loading", data: defaultValue },
        ),
        startWith({
          status: "loading",
          data: defaultValue,
        } as Loadable<YieldxyzPosition[]>),
      ),
    ),
    distinctUntilChanged<Loadable<YieldxyzPosition[]>>(isEqual),
    shareReplay({ refCount: true, bufferSize: 1 }),
    keepAlive(KEEP_ALIVE),
  ),
)
