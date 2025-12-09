import { keepAlive, Loadable } from "@talismn/util"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { concatMap, defer, distinctUntilChanged, shareReplay, startWith, take, tap } from "rxjs"

import { YieldxyzProvider } from "./fetchYieldxyzProviders"
import { getYieldxyzProviders$ } from "./getYieldxyzProviders"
import { updateYieldxyzProvidersStore, yieldxyzProvidersStore$ } from "./store.providers"

// const REFRESH_INTERVAL = 30_000 // TODO push to 60s before release
// const BATCH_SIZE = 50
const KEEP_ALIVE = 3_000

// type PositionsQuery = {
//   address: string
//   networkId: NetworkId
// }

// // Fetch a single batch of queries with shared product caching
// const fetchPositionsBatch = async (
//   rawQueries: PositionsQuery[],
//   remoteConfig: RemoteConfigStoreData,
//   signal: AbortSignal,
// ): Promise<YieldxyzPosition[]> => {
//   const toYieldyxzNetworksIdMap = getTalismanNetworkIdToYieldxyzNetworkIdMap(remoteConfig)
//   const toTalismanNetworksIdMap = getYieldxyzNetworkIdToTalismanNetworkIdMap(remoteConfig)

//   // Only send yield.xyz-shaped queries to the SDK
//   const queries = rawQueries
//     .map(({ address, networkId }) => ({
//       address,
//       network: toYieldyxzNetworksIdMap[networkId],
//     }))
//     .filter((q) => !!q.network)

//   const result = await yieldSdk.getAggregateBalances({ queries })
//   if (result.errors) log.warn("[Yield.xyz] getAggregateBalances returned errors", result.errors)

//   const positions = await Promise.all(
//     result.items.map(async (item) => {
//       // a position must be mono-account
//       if (uniq(item.balances.map((b) => b.address)).length !== 1) return null

//       // a position must be mono-network
//       if (uniq(item.balances.map((b) => b.token.network)).length !== 1) return null

//       // network must be known by Talisman
//       const address = item.balances[0].address
//       const networkId = toTalismanNetworksIdMap[item.balances[0].token.network]
//       if (!networkId) return null

//       // associated product must exist
//       const product = await getYieldxyzProduct(item.yieldId, signal)
//       if (!product) return null

//       return {
//         address,
//         networkId,
//         ...item,
//         product,
//       }
//     }),
//   )

//   return positions.filter(isNotNil)
// }

// // Main function that handles batching and parallel execution
// const fetchPositions = async (
//   queries: PositionsQuery[],
//   remoteConfig: RemoteConfigStoreData,
//   signal: AbortSignal,
// ): Promise<YieldxyzPosition[]> => {
//   try {
//     const batches = chunk(queries, BATCH_SIZE)

//     const results = await Promise.all(
//       batches.map((batch) => fetchPositionsBatch(batch, remoteConfig, signal)),
//     )

//     return results.flat()
//   } catch (err) {
//     log.error("[yield.xyz] fetchPositions error", { err })
//     throw err
//   }
// }

// const walletYieldxyzQueries$ = walletBalances$.pipe(
//   map((balances) => {
//     return uniq(balances.balances.map((b) => `${b.address}::${b.networkId}`))
//       .sort()
//       .map((serialized): PositionsQuery => {
//         const [address, networkId] = serialized.split("::") as [string, NetworkId]
//         return { address, networkId }
//       })
//   }),
//   distinctUntilChanged<PositionsQuery[]>(isEqual),
//   shareReplay({ refCount: true, bufferSize: 1 }),
// )

// const fetchYieldxyzProviders = (signal?: AbortSignal) => {
//   return yieldSdk({ signal })
// }

export const yieldxyzProviders$ = defer(() =>
  yieldxyzProvidersStore$.pipe(
    take(1),
    concatMap((defaultValue) =>
      getYieldxyzProviders$().pipe(
        startWith({
          status: "loading",
          data: defaultValue,
        } as Loadable<YieldxyzProvider[]>),
        distinctUntilChanged<Loadable<YieldxyzProvider[]>>(isEqual),
        tap({
          next: (result) => {
            if (result.status === "success") updateYieldxyzProvidersStore(result.data)
          },
          subscribe: () => log.debug("[yield.xyz] starting yield providers subscription"),
          unsubscribe: () => log.debug("[yield.xyz] stopping yield providers subscription"),
        }),
        shareReplay({ refCount: true, bufferSize: 1 }),
        keepAlive(KEEP_ALIVE),
      ),
    ),
  ),
)
