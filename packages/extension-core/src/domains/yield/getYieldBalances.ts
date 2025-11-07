import { getQuery$, keepAlive } from "@talismn/util"
import { BalancesQueryDto, Networks } from "@yieldxyz/sdk"
import chunk from "lodash-es/chunk"
import { combineLatest, firstValueFrom, from, map, shareReplay, switchMap } from "rxjs"

import { walletReady$ } from "../../libs/isWalletReady"
import { chaindataProvider } from "../../rpcs/chaindata"
import { isAddressCompatibleWithNetwork } from "../accounts/helpers"
import { balancesStore$ } from "../balances/store.balances"
import { keyringStore } from "../keyring/store"
import { fetchYieldBalances } from "./fetchYieldBalances"
import { createYieldPositions } from "./groupYieldBalances"
import { mapToYieldNetwork } from "./networkMapping"
import { YieldBalancesDtoWithProduct, YieldDto } from "./types"
import { yieldSdk } from "./yieldSdk"

const REFRESH_INTERVAL = 10_000

// Shared product cache to deduplicate product fetches across batches
const productCache = new Map<string, Promise<YieldDto>>()

const accountAddresses$ = keyringStore.accounts$.pipe(
  map((accounts) => {
    const addresses = accounts.map((a) => a.address)
    return addresses
  }),
)

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
      if (signal.aborted) return null
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
const fetchYieldBalancesForAddresses = async (
  addresses: string[],
  signal: AbortSignal,
): Promise<YieldBalancesDtoWithProduct[]> => {
  // Clear product cache at start of each polling cycle to ensure fresh data
  productCache.clear()

  const queries = await buildQueries(addresses)
  const batches = chunk(queries, 1)

  if (batches.length === 0) return []
  if (batches.length === 1) return fetchBatchWithProducts(batches[0], signal)

  // Parallel execution with combineLatest
  const results = await firstValueFrom(
    combineLatest(batches.map((batch) => from(fetchBatchWithProducts(batch, signal)))),
  )

  return results.flat()
}

export const yieldBalancesGrouped$ = walletReady$.pipe(
  switchMap(() =>
    accountAddresses$.pipe(
      switchMap((addresses) =>
        getQuery$({
          namespace: "yield-balances-grouped-v2", // Changed namespace to invalidate cache after grouping logic update
          args: addresses,
          queryFn: (addresses, signal) => fetchYieldBalancesForAddresses(addresses, signal),
          refreshInterval: REFRESH_INTERVAL,
        }).pipe(
          map((result) => {
            if (result.status === "loaded") {
              return { status: "success", data: createYieldPositions(result.data) }
            }
            return { status: "loading", data: [] }
          }),
        ),
      ),
    ),
  ),
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(60000),
)

const buildQueries = async (addresses: string[]): Promise<BalancesQueryDto[]> => {
  const networksMap = await chaindataProvider.getNetworksMapById()
  const allBalances = (await firstValueFrom(balancesStore$)).balances

  const queries: BalancesQueryDto[] = []
  const seen = new Set<string>()

  for (const address of addresses) {
    const addressBalances = allBalances.filter((b) => b.address === address)
    const networks = new Set<Networks>()

    for (const bal of addressBalances) {
      const net = networksMap[bal.networkId]
      if (!net) continue
      const yieldNet = mapToYieldNetwork(net.platform, net.id)
      if (yieldNet) networks.add(yieldNet as Networks)
    }

    for (const network of networks) {
      // Only query if address is compatible with network
      const networkObj =
        networksMap[
          Object.keys(networksMap).find((id) => {
            const net = networksMap[id]
            return net && mapToYieldNetwork(net.platform, net.id) === network
          })!
        ]
      if (!networkObj || !isAddressCompatibleWithNetwork(networkObj, address)) continue

      const key = `${address}-${network}`
      if (seen.has(key)) continue
      seen.add(key)
      queries.push({ address, network })
    }
  }

  return queries
}
