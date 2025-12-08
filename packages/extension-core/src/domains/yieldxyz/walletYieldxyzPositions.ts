import TTLCache from "@isaacs/ttlcache"
import { getQuery$, keepAlive, Loadable, QueryResult } from "@talismn/util"
import { BalancesQueryDto } from "@yieldxyz/sdk"
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
import { walletBalances$ } from "../balances/walletBalances"
import { createYieldxyzPositions } from "./createYieldxyzPositions"
import { fetchYieldxyzBalances } from "./fetchYieldxyzBalances"
import { getTalismanNetworkIdToYieldxyzNetworkIdMap } from "./helpers"
import { updateYieldxyzPositionsStore, yieldxyzPositionsStore$ } from "./store"
import { YieldDto, YieldxyzBalancesDtoWithProduct, YieldxyzPosition } from "./types"
import { yieldxyz } from "./yieldxyz"

const REFRESH_INTERVAL = 30_000 // TODO push to 60s before release
const BATCH_SIZE = 50
const KEEP_ALIVE = 3_000

// Products dont change and can be kept in memory for 10 minutes
const productCache = new TTLCache<string, Promise<YieldDto>>({ ttl: 600_000 })

// Fetch a single batch of queries with shared product caching
const fetchBatchWithProducts = async (
  queries: BalancesQueryDto[],
  signal: AbortSignal,
): Promise<YieldxyzBalancesDtoWithProduct[]> => {
  const balancesResp = await fetchYieldxyzBalances({ queries })
  const yieldIds = Array.from(new Set(balancesResp.map((i) => i.yieldId)))

  // Use shared cache for products to avoid duplicate fetches across batches
  const products = await Promise.all(
    yieldIds.map((yieldId) => {
      signal.throwIfAborted()
      if (!productCache.has(yieldId)) {
        productCache.set(yieldId, yieldxyz.getYield(yieldId))
      }
      return productCache.get(yieldId)!
    }),
  )

  const productById = new Map(
    products.filter((p): p is YieldDto => p !== null).map((p) => [p.id, p]),
  )

  return balancesResp.map((item) => ({
    ...item,
    product: productById.get(item.yieldId),
  }))
}

// Main function that handles batching and parallel execution
const fetchYieldBalanceQueries = async (
  queries: BalancesQueryDto[],
  signal: AbortSignal,
): Promise<YieldxyzBalancesDtoWithProduct[]> => {
  const batches = chunk(queries, BATCH_SIZE)

  const results = await Promise.all(batches.map((batch) => fetchBatchWithProducts(batch, signal)))

  return results.flat()
}

const walletYieldQueries$ = combineLatest([
  // walletBalances filters out all incompatible or balanceless network/account combinations already
  walletBalances$,
  // just need to match network/account pairs against supported networks, defined in remote config
  remoteConfigStore.observable,
]).pipe(
  map(([balances, remoteConfig]) => {
    const networksIdMap = getTalismanNetworkIdToYieldxyzNetworkIdMap(remoteConfig)

    return uniq(
      balances.balances
        .filter((b) => networksIdMap[b.networkId])
        .map((b) => `${b.address}::${b.networkId}`),
    )
      .sort()
      .map((serialized): BalancesQueryDto => {
        const [address, networkId] = serialized.split("::")
        return { address, network: networksIdMap[networkId] }
      })
  }),
  distinctUntilChanged<BalancesQueryDto[]>(isEqual),
  shareReplay({ refCount: true, bufferSize: 1 }),
)

export const walletYieldxyzPositions$ = defer(() =>
  yieldxyzPositionsStore$.pipe(
    take(1),
    concatMap((defaultValue) =>
      walletYieldQueries$.pipe(
        switchMap((queries) =>
          getQuery$({
            namespace: "walletYieldPositions$",
            args: queries,
            queryFn: async (queries, signal) => {
              const balances = await fetchYieldBalanceQueries(queries, signal)
              return createYieldxyzPositions(balances)
            },
            refreshInterval: REFRESH_INTERVAL,
            defaultValue,
          }),
        ),
        distinctUntilChanged<QueryResult<YieldxyzPosition[]>>(isEqual),
        tap({
          next: (positions) => {
            if (positions.status === "loaded") updateYieldxyzPositionsStore(positions.data)
          },
          subscribe: () => log.debug("[yield.xyz] starting yield balances subscription"),
          unsubscribe: () => log.debug("[yield.xyz] stopping yield balances subscription"),
        }),
        // TODO consolidate Loadable<T> and QueryResult<T> with a common type
        map((val): Loadable<YieldxyzPosition[]> => {
          switch (val.status) {
            case "loading":
              return { status: "loading", data: val.data }
            case "loaded":
              return { status: "success", data: val.data }
            case "error": {
              const error = val.error as Error | undefined
              return {
                status: "error",
                error: {
                  name: error?.name ?? "QueryError",
                  message: error?.message ?? "Failed to query yield balances",
                },
              }
            }
          }
        }),
        shareReplay({ refCount: true, bufferSize: 1 }),
        keepAlive(KEEP_ALIVE),
      ),
    ),
    tap((val) => log.debug("[yield.xyz] yield positions emit", val)),
  ),
)
