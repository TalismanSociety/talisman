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
import { YieldxyzPosition } from "./types"

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
      const product = await getYieldxyzProduct(item.yieldId, signal)
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
  signal: AbortSignal,
): Promise<YieldxyzPosition[]> => {
  try {
    const batches = chunk(queries, BATCH_SIZE)

    const results = await Promise.all(
      batches.map((batch) => fetchPositionsBatch(batch, remoteConfig, signal)),
    )

    return results.flat()
  } catch (err) {
    log.error("[yield.xyz] fetchPositions error", { err })
    throw err
  }
}

const walletYieldxyzQueries$ = walletBalances$.pipe(
  map((balances) => {
    return uniq(balances.balances.map((b) => `${b.address}::${b.networkId}`))
      .sort()
      .map((serialized): PositionsQuery => {
        const [address, networkId] = serialized.split("::") as [string, NetworkId]
        return { address, networkId }
      })
  }),
  distinctUntilChanged<PositionsQuery[]>(isEqual),
  shareReplay({ refCount: true, bufferSize: 1 }),
)

export const walletYieldxyzPositions$ = defer(() =>
  yieldxyzPositionsStore$.pipe(
    take(1),
    concatMap((defaultValue) =>
      combineLatest([walletYieldxyzQueries$, remoteConfigStore.observable]).pipe(
        switchMap(([queries, remoteConfig]) =>
          getLoadableQuery$({
            namespace: "walletYieldPositions$",
            args: [queries, remoteConfig] as const,
            queryFn: ([qs, rc], signal) => fetchPositions(qs, rc, signal),
            refreshInterval: REFRESH_INTERVAL,
            defaultValue,
          }),
        ),
        distinctUntilChanged<Loadable<YieldxyzPosition[]>>(isEqual),
        tap({
          next: (positions) => {
            if (positions.status === "success") updateYieldxyzPositionsStore(positions.data)
          },
          subscribe: () => log.debug("[yield.xyz] starting yield positions subscription"),
          unsubscribe: () => log.debug("[yield.xyz] stopping yield positions subscription"),
        }),
        shareReplay({ refCount: true, bufferSize: 1 }),
        keepAlive(KEEP_ALIVE),
      ),
    ),
  ),
)
