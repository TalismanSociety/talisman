import { getQuery$, keepAlive } from "@talismn/util"
import { BalancesQueryDto } from "@yieldxyz/sdk"
import { log } from "extension-shared"
import { chunk, isEqual, uniq } from "lodash-es"
import {
  combineLatest,
  distinctUntilChanged,
  firstValueFrom,
  from,
  map,
  shareReplay,
  switchMap,
  tap,
} from "rxjs"

import { remoteConfigStore } from "../app/store.remoteConfig"
import { walletBalances$ } from "../balances/walletBalances"
import { fetchYieldBalances } from "./fetchYieldBalances"
import { createYieldPositions } from "./groupYieldBalances"
import { getTalismanNetworkIdToYieldNetworkIdMap } from "./helpers"
import { YieldBalancesDtoWithProduct, YieldDto } from "./types"
import { yieldSdk } from "./yieldSdk"

const REFRESH_INTERVAL = 30_000 // TODO push to 60s before release
const BATCH_SIZE = 50

// TODO delete or rework the cache, otherwise positions will keep appearing after exiting, until next browser restart.

// Shared product cache to deduplicate product fetches across batches
const productCache = new Map<string, Promise<YieldDto>>()

// Fetch a single batch of queries with shared product caching
const fetchBatchWithProducts = async (
  queries: BalancesQueryDto[],
  signal: AbortSignal,
): Promise<YieldBalancesDtoWithProduct[]> => {
  const balancesResp = await fetchYieldBalances({ queries })
  const yieldIds = Array.from(new Set(balancesResp.map((i) => i.yieldId)))

  // Use shared cache for products to avoid duplicate fetches across batches
  const products = await Promise.all(
    yieldIds.map(async (yieldId) => {
      signal.throwIfAborted()
      if (!productCache.has(yieldId)) {
        productCache.set(yieldId, yieldSdk.getYield(yieldId))
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
): Promise<YieldBalancesDtoWithProduct[]> => {
  // Clear product cache at start of each polling cycle to ensure fresh data
  productCache.clear()

  // const queries = await buildQueries(addresses)
  const batches = chunk(queries, BATCH_SIZE)

  if (batches.length === 0) return []
  if (batches.length === 1) return fetchBatchWithProducts(batches[0], signal)

  // Parallel execution with combineLatest
  const results = await firstValueFrom(
    combineLatest(batches.map((batch) => from(fetchBatchWithProducts(batch, signal)))),
  )

  return results.flat()
}

const walletYieldQueries$ = combineLatest([
  // walletBalances filters out all incompatible or balanceless network/account combinations already
  walletBalances$,
  // just need to match network/account pairs against supported networks, defined in remote config
  remoteConfigStore.observable,
]).pipe(
  map(([balances, remoteConfig]) => {
    const networksIdMap = getTalismanNetworkIdToYieldNetworkIdMap(remoteConfig)

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

export const walletYieldPositions$ = walletYieldQueries$.pipe(
  switchMap((queries) =>
    getQuery$({
      namespace: "yield-balances-grouped-v2", // Changed namespace to invalidate cache after grouping logic update
      args: queries,
      queryFn: fetchYieldBalanceQueries,
      refreshInterval: REFRESH_INTERVAL,
    }).pipe(
      map((result) => {
        if (result.status === "loaded") {
          return { status: "success", data: createYieldPositions(result.data) }
        }
        return result
      }),
    ),
  ),
  tap({
    subscribe: () => {
      log.debug("[yield.xyz] starting yield balances subscription")
      // TODO save to store
    },
    unsubscribe: () => log.debug("[yield.xyz] stopping yield balances subscription"),
  }),
  // TODO startWith() from store
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(60000),
)
