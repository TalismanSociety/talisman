import { getQuery$, keepAlive } from "@talismn/util"
import { BalancesQueryDto, Networks } from "@yieldxyz/sdk"
import { firstValueFrom, map, shareReplay, switchMap } from "rxjs"

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

const accountAddresses$ = keyringStore.accounts$.pipe(
  map((accounts) => {
    const addresses = accounts.map((a) => a.address)
    return addresses
  }),
)

// Simplified version using getQuery$
const fetchYieldBalancesForAddresses = async (
  addresses: string[],
  signal: AbortSignal,
): Promise<YieldBalancesDtoWithProduct[]> => {
  const products: YieldDto[] = []
  const q = await buildQueries(addresses)
  const balancesResp = await fetchYieldBalances({ queries: q })
  const yieldIds = Array.from(new Set(balancesResp.map((i) => i.yieldId)))

  await Promise.all(
    yieldIds.map(async (p) => {
      if (signal.aborted) return
      const product = await yieldSdk.getYield(p)
      products.push(product)
    }),
  )

  const productById = new Map<string, YieldDto>(products.map((p) => [p.id, p]))
  return balancesResp.map((item) => ({
    ...item,
    product: productById.get(item.yieldId),
  }))
}

export const yieldBalancesGrouped$ = walletReady$.pipe(
  switchMap(() =>
    accountAddresses$.pipe(
      switchMap((addresses) =>
        getQuery$({
          namespace: "yield-balances",
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
