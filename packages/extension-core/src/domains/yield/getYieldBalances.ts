import { getLoadable$, getSharedObservable, keepAlive, Loadable } from "@talismn/util"
import { isEqual } from "lodash-es"
import { distinctUntilChanged, firstValueFrom, map, shareReplay, switchMap, take, tap } from "rxjs"

import { walletReady$ } from "../../libs/isWalletReady"
import { chaindataProvider } from "../../rpcs/chaindata"
import { balancesStore$ } from "../balances/store.balances"
import { keyringStore } from "../keyring/store"
import { fetchYieldBalances } from "./fetchYieldBalances"
import { fetchYieldProducts } from "./getYieldProducts"
import { mapToYieldNetwork } from "./networkMapping"
import { updateYieldBalancesStore, yieldBalancesStore$ } from "./store"
import {
  YieldBalanceQuery,
  YieldPositionItem,
  YieldPositionWithProduct,
  YieldProduct,
} from "./types"

const REFRESH_INTERVAL = 30_000

const accountAddresses$ = keyringStore.accounts$.pipe(
  map((accounts) => accounts.map((a) => a.address)),
)

export const yieldBalances$ = walletReady$.pipe(
  switchMap(() => accountAddresses$),
  switchMap((addresses) => {
    return yieldBalancesStore$.pipe(
      take(1),
      switchMap((storage) => getBalances$(addresses, storage)),
    )
  }),
  tap((loadable) => {
    if (loadable.status === "success")
      updateYieldBalancesStore(loadable.data as unknown as YieldPositionItem[])
  }),
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(3000),
)

const getBalances$ = (addresses: string[], storage: YieldPositionItem[]) =>
  getSharedObservable("yield-balances", { addresses, REFRESH_INTERVAL }, () =>
    getLoadable$(
      async () => {
        const q = await buildQueries(addresses)
        const balancesResp = await fetchYieldBalances(q)
        const yieldIds = Array.from(new Set(balancesResp.items.map((i) => i.yieldId)))
        const products = yieldIds.length ? await fetchYieldProducts({ yieldIds }) : []
        const productById = new Map<string, YieldProduct>(products.map((p) => [p.id, p]))
        const enriched: YieldPositionWithProduct[] = balancesResp.items.map((item) => ({
          ...item,
          product: productById.get(item.yieldId),
        }))
        return { items: enriched }
      },
      {
        refreshInterval: REFRESH_INTERVAL,
      },
    ),
  ).pipe(
    map((loadable) => ({
      ...loadable,
      data: (loadable.data?.items as YieldPositionWithProduct[]) ?? storage,
    })),
    distinctUntilChanged<Loadable<YieldPositionWithProduct[]>>(isEqual),
  )

const buildQueries = async (addresses: string[]): Promise<YieldBalanceQuery[]> => {
  const networksMap = await chaindataProvider.getNetworksMapById()
  const allBalances = (await firstValueFrom(balancesStore$)).balances

  const queries: YieldBalanceQuery[] = []
  const seen = new Set<string>()

  for (const address of addresses) {
    const addressBalances = allBalances.filter((b) => b.address === address)
    const networks = new Set<string>()

    for (const bal of addressBalances) {
      const net = networksMap[bal.networkId]
      if (!net) continue
      const yieldNet = mapToYieldNetwork(net.platform, net.id)
      if (yieldNet) networks.add(yieldNet)
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
