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
  merge,
  scan,
  shareReplay,
  startWith,
  Subject,
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
import { updateYieldxyzPositionsStore, yieldxyzPositionsStore$ } from "./store.positions"
import { BalancesResponseDto, YieldBalancesDto, YieldxyzPosition } from "./types"

const REFRESH_INTERVAL = 60_000
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
    const remoteConfig = await firstValueFrom(remoteConfigStore.observable)
    const toTalismanNetworksIdMap = getYieldxyzNetworkIdToTalismanNetworkIdMap(remoteConfig)

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

    const { balances } = (await req.json()) as YieldBalancesDto

    if (!balances.length) return null
    const networkId = toTalismanNetworksIdMap[balances[0].token.network]
    if (!networkId) {
      log.warn("No networkId found for", balances)
      return null
    }

    return { yieldId, networkId, address, balances }
  } catch (err) {
    log.error("[yield.xyz] fetchPositions error", { err })
    throw err
  }
}

// Subject to emit single position overrides without interrupting the main query
const positionOverride$ = new Subject<YieldxyzPosition>()

type PositionsAction =
  | { type: "main"; loadable: Loadable<YieldxyzPosition[]> }
  | { type: "override"; position: YieldxyzPosition; timestamp: number }

type PositionsState = {
  loadable: Loadable<YieldxyzPosition[]>
  // Track when the current main query started (on "loading" emission)
  queryStartTime: number | null
  // Overrides with their timestamps
  pendingOverrides: Map<string, { position: YieldxyzPosition; timestamp: number }>
}

const getPositionKey = (pos: YieldxyzPosition) => `${pos.yieldId}::${pos.address}`

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
  ),
)

export const walletYieldxyzPositions$ = merge(
  mainPositionsQuery$.pipe(map((loadable): PositionsAction => ({ type: "main", loadable }))),
  positionOverride$.pipe(
    map((position): PositionsAction => ({ type: "override", position, timestamp: Date.now() })),
  ),
).pipe(
  scan(
    (state, action): PositionsState => {
      if (action.type === "main") {
        const isLoading = action.loadable.status === "loading"

        if (isLoading) {
          // Main query just started - record the start time, keep existing overrides
          return {
            ...state,
            loadable: action.loadable,
            queryStartTime: state.queryStartTime ?? Date.now(),
          }
        } else {
          // Main query completed with success
          // Keep overrides that happened AFTER this query started (they're fresher)
          // Discard overrides from before the query started (main query has fresher data)
          const queryStartTime = state.queryStartTime ?? 0

          const freshOverrides = new Map<
            string,
            { position: YieldxyzPosition; timestamp: number }
          >()
          for (const [key, override] of state.pendingOverrides) {
            if (override.timestamp > queryStartTime) {
              freshOverrides.set(key, override)
            }
          }

          // Start with main query data, then re-apply fresh overrides
          let finalData = action.loadable.data ?? []
          for (const { position } of freshOverrides.values()) {
            const existingIndex = finalData.findIndex(
              (pos) => pos.yieldId === position.yieldId && pos.address === position.address,
            )
            finalData =
              existingIndex >= 0
                ? finalData.map((pos, i) => (i === existingIndex ? position : pos))
                : [...finalData, position]
          }

          return {
            loadable: { ...action.loadable, data: finalData },
            queryStartTime: null, // Reset for next query cycle
            pendingOverrides: freshOverrides,
          }
        }
      } else {
        // Override - merge into current data without interrupting main query
        const key = getPositionKey(action.position)
        const newOverrides = new Map(state.pendingOverrides).set(key, {
          position: action.position,
          timestamp: action.timestamp,
        })

        const currentData = state.loadable.data ?? []
        const existingIndex = currentData.findIndex(
          (pos) =>
            pos.yieldId === action.position.yieldId && pos.address === action.position.address,
        )

        const updatedData =
          existingIndex >= 0
            ? currentData.map((pos, i) => (i === existingIndex ? action.position : pos))
            : [...currentData, action.position]

        return {
          ...state,
          loadable: { ...state.loadable, data: updatedData },
          pendingOverrides: newOverrides,
        }
      }
    },
    {
      loadable: { status: "loading", data: [] } as Loadable<YieldxyzPosition[]>,
      queryStartTime: null as number | null,
      pendingOverrides: new Map<string, { position: YieldxyzPosition; timestamp: number }>(),
    },
  ),
  map((state) => state.loadable),
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
      positionOverride$.next(position)
      log.log("Position refresh complete", { yieldId, address })
    }
  } catch (err) {
    log.error("Failed to refresh position", { yieldId, address, err })
  }
}
