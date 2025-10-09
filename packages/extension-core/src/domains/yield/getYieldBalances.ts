import { getLoadable$, getSharedObservable, keepAlive, Loadable } from "@talismn/util"
import { BalancesQueryDto, Networks } from "@yieldxyz/sdk"
import { isEqual } from "lodash-es"
import { distinctUntilChanged, firstValueFrom, map, shareReplay, switchMap, take, tap } from "rxjs"

import { walletReady$ } from "../../libs/isWalletReady"
import { chaindataProvider } from "../../rpcs/chaindata"
import { balancesStore$ } from "../balances/store.balances"
import { keyringStore } from "../keyring/store"
import { fetchYieldBalances } from "./fetchYieldBalances"
import { groupYieldBalances } from "./groupYieldBalances"
import { mapToYieldNetwork } from "./networkMapping"
import { updateYieldBalancesStore, yieldBalancesStore$ } from "./store"
import { YieldBalancesDtoWithProduct, YieldDto, YieldPositionItem } from "./types"
import { yieldSdk } from "./yieldSdk"

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
      updateYieldBalancesStore(loadable.data as YieldPositionItem[])
  }),
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(3000),
)

// Grouped yield balances for UI consumption
export const yieldBalancesGrouped$ = yieldBalances$.pipe(
  map((loadable) => {
    if (loadable.status === "success" && loadable.data) {
      const grouped = groupYieldBalances(loadable.data)
      return {
        ...loadable,
        data: grouped,
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

const getBalances$ = (addresses: string[], storage: YieldPositionItem[]) =>
  getSharedObservable("yield-balances", { addresses, REFRESH_INTERVAL }, () =>
    getLoadable$(
      async () => {
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
        return { items: enriched }
      },
      {
        refreshInterval: REFRESH_INTERVAL,
      },
    ),
  ).pipe(
    map((loadable) => ({
      ...loadable,
      data: (loadable.data?.items as YieldBalancesDtoWithProduct[]) ?? storage,
    })),
    distinctUntilChanged<Loadable<YieldBalancesDtoWithProduct[]>>(isEqual),
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
      const key = `${address}-${network}`
      if (seen.has(key)) continue
      seen.add(key)
      queries.push({ address, network })
    }
  }

  return queries
}
