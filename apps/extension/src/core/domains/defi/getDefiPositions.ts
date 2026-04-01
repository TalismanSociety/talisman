import { ASSET_DISCOVERY_API_URL } from "@common/constants"
import { log } from "@common/log"
import { isAddressEqual } from "@talismn/crypto"
import { isAccountNotContact } from "@talismn/keyring"
import { getLoadable$, getSharedObservable, keepAlive, type Loadable } from "@talismn/util"
import { isEqual } from "lodash-es"
import { distinctUntilChanged, map, shareReplay, switchMap, take, tap } from "rxjs"
import urlJoin from "url-join"

import { walletReady$ } from "../../libs/isWalletReady"
import { keyringStore } from "../keyring/store"
import { defiPositionsStore$, updateDefiPositionsStore } from "./store"
import type { DefiPosition } from "./types"

const REFRESH_INTERVAL = 20_000 // refresh every 20 seconds, though data is cached on api side

export const defiPositions$ = walletReady$.pipe(
  switchMap(() => accountAddresses$),
  switchMap((addresses) => {
    return defiPositionsStore$.pipe(
      take(1), // we only want an initial value, changes to the store should not re-emit
      switchMap((storage) => getDefiPositions$(addresses, storage))
    )
  }),
  tap({
    subscribe: () => log.debug("[DeFi] starting main subscription"),
    unsubscribe: () => log.debug("[DeFi] stopping main subscription"),
    next: (loadable) => {
      log.debug("[DeFi] subscription emit", loadable)
      if (loadable.status === "success") updateDefiPositionsStore(loadable.data)
    },
  }),
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(3000)
)

const accountAddresses$ = keyringStore.accounts$.pipe(
  map((accounts) => accounts.filter(isAccountNotContact).map((account) => account.address))
)

const filterDefiPositions = (addresses: string[], positions: DefiPosition[]) => {
  return positions.filter(
    (position) =>
      // keep only positions that match any of the provided addresses
      addresses.some((addr) => isAddressEqual(addr, position.address)) &&
      // yield.xyz positions are fetched separately via the yield.xyz API
      position.defiName !== "Yield.xyz"
  )
}

const fetchDefiPositions = async (addresses: string[]) => {
  const url = urlJoin(ASSET_DISCOVERY_API_URL, "defi")
  log.debug("[DeFi] Fetching defi positions for addresses", { addresses, url })

  const response = await fetch(url, { method: "POST", body: JSON.stringify({ addresses }) })
  if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`)

  const positions = (await response.json()) as DefiPosition[]

  for (const p of positions) {
    if (p.type === "unknown" && p._dbg_type) {
      // biome-ignore lint/suspicious/noConsole: useful for auditing unmapped defi position types
      console.warn(`unknown defi position type: ${p._dbg_type} (${p.defiName} / ${p.name})`)
    }
  }

  // yield.xyz positions are fetched separately via the yield.xyz API
  return positions.filter((p) => p.defiName !== "Yield.xyz")
}

const getDefiPositions$ = (addresses: string[], storage: DefiPosition[]) =>
  getSharedObservable("defi-positions", { addresses, REFRESH_INTERVAL }, () =>
    getLoadable$(() => fetchDefiPositions(addresses), { refreshInterval: REFRESH_INTERVAL })
  ).pipe(
    map((loadable) => ({
      ...loadable,
      // fallback to storage
      data: loadable.data ?? filterDefiPositions(addresses, storage),
    })),
    distinctUntilChanged<Loadable<DefiPosition[]>>(isEqual)
  )
