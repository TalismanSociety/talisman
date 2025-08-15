import { bind } from "@react-rxjs/core"
import { normalizeAddress } from "@talismn/crypto"
import { Loadable } from "@talismn/util"
import { DefiPosition } from "extension-core"
import { BehaviorSubject, combineLatest, map, Observable, ReplaySubject, shareReplay } from "rxjs"

import { api } from "@ui/api"

import { getNetworks$ } from "./chaindata"
import { portfolioNetworkFilter$, portfolioSearch$, portfolioSelectedAccounts$ } from "./portfolio"

const DEFAULT_DEFI_POSITIONS: Loadable<DefiPosition[]> = {
  status: "loading",
  data: [],
}

export type ProtocolOption = {
  name: string
  logo: string | null
  valueUsd: number
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

const subjectProtocolFilter = new BehaviorSubject<string | null>(null)

export const [useDefiProtocolFilter, defiProtocolFilter$] = bind(subjectProtocolFilter)

export const setDefiProtocolFilter = (name: string | null) => {
  subjectProtocolFilter.next(name || null)
}

export const [useDefiProtocolFilterOptions, defiProtocolFilterOptions$] = bind(
  defiPositions$.pipe(
    map(({ data: positions }) => {
      const valueUsdByProtocol =
        positions?.reduce(
          (acc, position) => {
            const positionValue = position.breakdown.reduce(
              (sum, breakdown) => sum + (breakdown.valueUsd ?? 0),
              0,
            )
            acc[position.defiName] = (acc[position.defiName] || 0) + positionValue
            return acc
          },
          {} as Record<string, number>,
        ) ?? {}

      const protocols: ProtocolOption[] = []
      for (const position of positions || []) {
        if (protocols.some((p) => p.name === position.defiName)) continue
        protocols.push({
          name: position.defiName,
          logo: position.defiLogoUrl,
          valueUsd: valueUsdByProtocol[position.defiName] || 0,
        })
      }

      return protocols.sort((a, b) => b.valueUsd - a.valueUsd)
    }),
  ),
  [],
)

export const [useDefiProtocolFilterOption, getDefiProtocolFilterOption$] = bind(
  combineLatest([defiProtocolFilterOptions$, defiProtocolFilter$]).pipe(
    map(([protocolOptions, protocolId]) => {
      if (!protocolId) return null
      return protocolOptions.find((option) => option.name === protocolId) ?? null
    }),
  ),
  null,
)

const filteredDefiPositions$ = combineLatest({
  accounts: portfolioSelectedAccounts$,
  network: portfolioNetworkFilter$,
  activeNetworks: getNetworks$({ activeOnly: true, includeTestnets: false }),
  rawPositions: rawDefiPositions$,
  protocolName: defiProtocolFilter$,
}).pipe(
  map(({ accounts, network, activeNetworks, rawPositions, protocolName }) => {
    const accountAddresses = new Set(accounts?.map((account) => normalizeAddress(account.address)))
    const networkIds = new Set(network ? network.networkIds : activeNetworks.map((n) => n.id))

    const data = rawPositions.data
      ?.filter((position) => {
        return !accounts || accountAddresses.has(normalizeAddress(position.address))
      })
      .filter((position) => {
        return !protocolName || position.defiName === protocolName
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

export const [useDefiPositionsDisplay, defiPositionsDisplay$] = bind(
  combineLatest({
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
  ),
  DEFAULT_DEFI_POSITIONS,
)

export const [useDefiPosition] = bind(
  (id: string | null | undefined) =>
    defiPositions$.pipe(
      map((loadable) => loadable.data?.find((position) => position.id === id) ?? null),
    ),
  null,
)
