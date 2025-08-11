import { bind } from "@react-rxjs/core"
import { normalizeAddress } from "@talismn/crypto"
import { Loadable } from "@talismn/util"
import { DefiPosition } from "extension-core"
import { combineLatest, map, Observable, ReplaySubject, shareReplay } from "rxjs"

import { api } from "@ui/api"

import { getNetworks$ } from "./chaindata"
import { portfolioNetworkFilter$, portfolioSearch$, portfolioSelectedAccounts$ } from "./portfolio"

const DEFAULT_DEFI_POSITIONS: Loadable<DefiPosition[]> = {
  status: "loading",
  data: [],
}

const subjectRawDefiPositions$ = new ReplaySubject<Loadable<DefiPosition[]>>(1)

const rawDefiPositions$ = new Observable<Loadable<DefiPosition[]>>((subscriber) => {
  const sub = subjectRawDefiPositions$.subscribe(subscriber)

  const unsubscribe = api.defiPositionsSubscribe((loadable) => {
    subjectRawDefiPositions$.next(loadable)
  })

  return () => {
    sub.unsubscribe()
    unsubscribe()
  }
})

export const [useDefiPositions, defiPositions$] = bind(rawDefiPositions$, DEFAULT_DEFI_POSITIONS)

const filteredDefiPositions$ = combineLatest({
  accounts: portfolioSelectedAccounts$,
  network: portfolioNetworkFilter$,
  activeNetworks: getNetworks$({ activeOnly: true, includeTestnets: false }),
  rawPositions: rawDefiPositions$,
}).pipe(
  map(({ accounts, network, activeNetworks, rawPositions }) => {
    const accountAddresses = new Set(accounts?.map((account) => normalizeAddress(account.address)))
    const networkIds = new Set(network ? network.networkIds : activeNetworks.map((n) => n.id))

    const data = rawPositions.data
      ?.filter((position) => {
        return !accounts || accountAddresses.has(normalizeAddress(position.address))
      })
      .filter((position) => {
        return networkIds.has(position.networkId)
      })
      .sort((a, b) => {
        const getPositionTotal = (position: DefiPosition) =>
          position.breakdown.reduce((total, item) => total + item.valueUsd, 0)

        return getPositionTotal(b) - getPositionTotal(a)
      })

    return {
      ...rawPositions,
      data,
    } as Loadable<DefiPosition[]>
  }),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const defiPositionsDisplay$ = combineLatest({
  search: portfolioSearch$,
  filtered: filteredDefiPositions$,
}).pipe(
  map(({ search, filtered }) => {
    const lowerSearch = search.toLowerCase()
    return {
      ...filtered,
      data: filtered.data?.filter(({ name, symbol }) =>
        [name, symbol].join("").toLowerCase().includes(lowerSearch),
      ),
    } as Loadable<DefiPosition[]>
  }),
)

export const [useDefiPositionsDisplay] = bind(defiPositionsDisplay$, DEFAULT_DEFI_POSITIONS)
