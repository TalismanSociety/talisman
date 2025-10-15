import { getSharedObservable, keepAlive, Loadable } from "@talismn/util"
import { BalancesQueryDto, Networks } from "@yieldxyz/sdk"
import { isEqual } from "lodash-es"
import {
  distinctUntilChanged,
  firstValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
} from "rxjs"

import { walletReady$ } from "../../libs/isWalletReady"
import { chaindataProvider } from "../../rpcs/chaindata"
import { balancesStore$ } from "../balances/store.balances"
import { keyringStore } from "../keyring/store"
import { fetchYieldBalances } from "./fetchYieldBalances"
import { createYieldPositions } from "./groupYieldBalances"
import { mapToYieldNetwork } from "./networkMapping"
import { updateYieldBalancesStore, yieldBalancesStore$ } from "./store"
import { YieldBalancesDtoWithProduct, YieldDto, YieldPositionItem } from "./types"
import { yieldSdk } from "./yieldSdk"

const REFRESH_INTERVAL = 10_000

const accountAddresses$ = keyringStore.accounts$.pipe(
  map((accounts) => accounts.map((a) => a.address)),
)

export const yieldBalances$ = walletReady$.pipe(
  switchMap(() => {
    // Start with loading state
    return of({ status: "loading", data: [] } as Loadable<YieldPositionItem[]>).pipe(
      switchMap((loadingState) => {
        // Try to get cached data first
        return yieldBalancesStore$.pipe(
          take(1),
          switchMap((storage) => {
            // If we have cached data, emit it immediately
            if (storage.length > 0) {
              return of({ status: "success", data: storage } as Loadable<YieldPositionItem[]>).pipe(
                // Also fetch fresh data in the background
                switchMap((cachedLoadable) => {
                  return accountAddresses$.pipe(
                    switchMap((addresses) => getBalances$(addresses, storage)),
                    // Merge with cached data to ensure we always have something to show
                    map((freshLoadable) => ({
                      ...freshLoadable,
                      data: freshLoadable.data || cachedLoadable.data,
                    })),
                  )
                }),
              )
            }
            // If no cached data, fetch fresh data
            return accountAddresses$.pipe(
              switchMap((addresses) => getBalances$(addresses, storage)),
              startWith(loadingState),
            )
          }),
          // Fallback if store doesn't emit
          startWith(loadingState),
        )
      }),
    )
  }),
  tap((loadable) => {
    if (loadable.status === "success")
      updateYieldBalancesStore(loadable.data as YieldPositionItem[])
  }),
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(3000),
)

// Make the observable hot by subscribing to it immediately
// This ensures the background chain is always active
yieldBalances$.subscribe()

// Grouped yield balances for UI consumption
export const yieldBalancesGrouped$ = yieldBalances$.pipe(
  map((loadable) => {
    if (loadable.status === "success" && loadable.data) {
      const positions = createYieldPositions(loadable.data)
      return {
        ...loadable,
        data: positions,
      }
    }
    return {
      ...loadable,
      data: [],
    }
  }),
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(3000),
)

const getBalances$ = (addresses: string[], storage: YieldPositionItem[]) => {
  const uniqueKey = `yield-balances-${addresses.join(",")}`
  return getSharedObservable(uniqueKey, { addresses, REFRESH_INTERVAL }, () => {
    return new Observable<Loadable<YieldBalancesDtoWithProduct[]>>((subscriber) => {
      subscriber.next({ status: "loading", data: [] })

      const fetchData = async () => {
        try {
          const products: YieldDto[] = []
          const q = await buildQueries(addresses)
          const balancesResp = await fetchYieldBalances({ queries: q })
          const yieldIds = Array.from(new Set(balancesResp.map((i) => i.yieldId)))

          await Promise.all(
            yieldIds.map(async (p) => {
              const product = await yieldSdk.getYield(p)
              products.push(product)
            }),
          )
          const productById = new Map<string, YieldDto>(products.map((p) => [p.id, p]))
          const enriched: YieldBalancesDtoWithProduct[] = balancesResp.map((item) => ({
            ...item,
            product: productById.get(item.yieldId),
          }))
          subscriber.next({ status: "success", data: enriched })
        } catch (error) {
          subscriber.next({ status: "error", data: [], error: error as Error })
        }
      }

      fetchData()

      return () => {}
    })
  }).pipe(
    map((loadable) => ({
      ...loadable,
      // fallback to storage - this ensures cached data is shown immediately
      data: (loadable.data as YieldBalancesDtoWithProduct[]) ?? storage,
    })),
    distinctUntilChanged<Loadable<YieldBalancesDtoWithProduct[]>>(isEqual),
  )
}

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
      const key = `${address}-${network}`
      if (seen.has(key)) continue
      seen.add(key)
      queries.push({ address, network })
    }
  }

  return queries
}
