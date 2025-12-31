import { NetworkId } from "@talismn/chaindata-provider"
import { getLoadableQuery$, isNotNil, keepAlive, Loadable } from "@talismn/util"
import { log, YIELD_API_BASE_URL } from "extension-shared"
import { chunk, isEqual, uniq } from "lodash-es"
import {
  combineLatest,
  concatMap,
  defer,
  distinctUntilChanged,
  firstValueFrom,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
} from "rxjs"

import { remoteConfigStore } from "../../app/store.remoteConfig"
import { RemoteConfigStoreData } from "../../app/types"
import { walletBalances$ } from "../../balances/walletBalances"
import {
  getTalismanNetworkIdToYieldxyzNetworkIdMap,
  getYieldxyzNetworkIdToTalismanNetworkIdMap,
} from "./helpers"
import {
  removeYieldxyzPositionsByYieldIdAndAddress,
  updateYieldxyzPositionsStore,
  upsertYieldxyzPositionsByYieldIdAndAddress,
  yieldxyzPositionsStore$,
} from "./store.positions"
import { BalancesResponseDto, YieldBalancesDto, YieldxyzPosition } from "./types"

const REFRESH_INTERVAL = 60_000
const BATCH_SIZE = 20
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
  try {
    const toYieldyxzNetworksIdMap = getTalismanNetworkIdToYieldxyzNetworkIdMap(remoteConfig)
    const toTalismanNetworksIdMap = getYieldxyzNetworkIdToTalismanNetworkIdMap(remoteConfig)

    // Only send yield.xyz-shaped queries to the SDK
    const queries = rawQueries
      .map(({ address, networkId }) => ({
        address,
        network: toYieldyxzNetworksIdMap[networkId],
      }))
      .filter((q) => !!q.network)

    if (!queries.length) return []

    const req = await fetch(`${YIELD_API_BASE_URL}/talisman/positions`, {
      signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ queries }),
    })

    if (!req.ok)
      throw new Error(`Failed to fetch yieldxyz balances: ${req.status} ${req.statusText}`)

    const result = (await req.json()) as BalancesResponseDto

    if (result.errors) log.warn("[Yield.xyz] getAggregateBalances returned errors", result.errors)

    const positions = result.items.map((item) => {
      // a position must be mono-account
      if (uniq(item.balances.map((b) => b.address)).length !== 1) return null

      // a position must be mono-network
      if (uniq(item.balances.map((b) => b.token.network)).length !== 1) return null

      // network must be known by Talisman
      const address = item.balances[0].address
      const networkId = toTalismanNetworksIdMap[item.balances[0].token.network]
      if (!networkId) return null

      return {
        address,
        networkId,
        ...item,
      }
    })

    return positions.filter(isNotNil)
  } catch (err) {
    log.error("[yield.xyz] fetchPositionsBatch error", { err, rawQueries })
    throw err
  }
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

const fetchPosition = async (
  yieldId: string,
  address: string,
  signal: AbortSignal,
): Promise<YieldxyzPosition | null> => {
  try {
    const req = await fetch(
      `${YIELD_API_BASE_URL}/v1/yields/${encodeURIComponent(yieldId)}/balances`,
      {
        signal,
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      },
    )

    if (!req.ok)
      throw new Error(`Failed to fetch yieldxyz position balances: ${req.status} ${req.statusText}`)

    const { balances } = (await req.json()) as YieldBalancesDto

    if (!balances.length) return null

    const remoteConfig = await firstValueFrom(remoteConfigStore.observable)
    const toTalismanNetworksIdMap = getYieldxyzNetworkIdToTalismanNetworkIdMap(remoteConfig)

    const networkId = toTalismanNetworksIdMap[balances[0].token.network]
    if (!networkId) {
      log.warn("No networkId found for", balances)
      return null
    }

    return { yieldId, networkId, address, balances }
  } catch (err) {
    log.error("[yield.xyz] fetchPosition error", { err, yieldId, address })
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
)

const mainPositionsQuery$ = defer(() =>
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
        tap((positions) => {
          if (positions.status === "success") updateYieldxyzPositionsStore(positions.data)
        }),
        startWith({
          status: "loading",
          data: defaultValue,
        } as Loadable<YieldxyzPosition[]>),
      ),
    ),
  ),
)

export const walletYieldxyzPositions$ = combineLatest([
  mainPositionsQuery$,
  yieldxyzPositionsStore$,
]).pipe(
  map(
    ([queryLoadable, storePositions]): Loadable<YieldxyzPosition[]> => ({
      ...queryLoadable,
      // Always show the persisted store as the source of truth.
      // This makes refresh durable even if no one is currently subscribed.
      data: storePositions,
    }),
  ),
  distinctUntilChanged<Loadable<YieldxyzPosition[]>>(isEqual),
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(KEEP_ALIVE),
)

export const refreshYieldxyzPosition = async ({
  yieldId,
  address,
}: {
  yieldId: string
  address: string
}) => {
  log.log("Refreshing yield.xyz position", { yieldId, address })
  try {
    const controller = new AbortController()
    // Set a reasonable timeout for single position fetch
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    const position = await fetchPosition(yieldId, address, controller.signal)
    clearTimeout(timeoutId)

    if (position) {
      upsertYieldxyzPositionsByYieldIdAndAddress(position)
      log.log("Position refresh complete", { yieldId, address })
    } else {
      // Refresh can represent an exit/close, which yields empty balances.
      // In that case, remove all 1/n entries matching yieldId+address.
      removeYieldxyzPositionsByYieldIdAndAddress(yieldId, address)
      log.log("Position refresh removed", { yieldId, address })
    }
  } catch (err) {
    log.error("Failed to refresh position", { yieldId, address, err })
  }
}
