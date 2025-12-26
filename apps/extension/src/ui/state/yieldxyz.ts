import { bind } from "@react-rxjs/core"
import { NetworkId } from "@talismn/chaindata-provider"
import { isNotNil, Loadable } from "@talismn/util"
import {
  getTalismanNetworkIdToYieldxyzNetworkIdMap,
  getYieldxyzNetworkIdToTalismanNetworkIdMap,
  Networks,
  YieldDto,
  YieldxyzPosition,
  YieldxyzProvider,
} from "extension-core"
import { log } from "extension-shared"
import { keyBy } from "lodash-es"
import { combineLatest, map, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

import { remoteConfig$ } from "./remoteConfig"
import { debugObservable } from "./util/debugObservable"

// Add new observable for grouped yield balances using bind()
const rawYieldxyzProviders$ = new Observable<Loadable<YieldxyzProvider[]>>((subscriber) => {
  // TODO rename to yieldPositionsSubscribe, or earn
  const unsubscribe = api.yieldxyzProvidersSubscribe((loadable: Loadable<YieldxyzProvider[]>) => {
    subscriber.next(loadable)
  })

  return () => {
    // TODO remove after unsubscribe works
    log.debug("[frontend] Unsubscribing from api.yieldxyzProvidersSubscribe")
    unsubscribe()
  }
}).pipe(
  debugObservable("rawYieldxyzProviders$", true),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [useYieldxyzProviders, yieldxyzProviders$] = bind(rawYieldxyzProviders$, {
  status: "loading",
  data: [],
})

export const [useYieldxyzProvider, yieldxyzProvider$] = bind(
  (providerId: string | null | undefined) =>
    yieldxyzProviders$.pipe(
      map((loadable) => {
        if (!providerId)
          return { status: "success", data: null } as Loadable<YieldxyzProvider | null>
        const provider = loadable.data?.find((p) => p.id === providerId) || null
        return { ...loadable, data: provider } as Loadable<YieldxyzProvider | null>
      }),
    ),
  { status: "loading", data: null },
)

// Add new observable for grouped yield balances using bind()
const rawYieldxyzProducts$ = new Observable<Loadable<YieldDto[]>>((subscriber) => {
  // TODO rename to yieldPositionsSubscribe, or earn
  const unsubscribe = api.yieldxyzProductsSubscribe((loadable: Loadable<YieldDto[]>) => {
    subscriber.next(loadable)
  })

  return () => {
    // TODO remove after unsubscribe works
    log.debug("[frontend] Unsubscribing from api.yieldxyzProductsSubscribe")
    unsubscribe()
  }
}).pipe(
  debugObservable("rawYieldxyzProducts$", true),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [useYieldxyzProducts, yieldxyzProducts$] = bind(rawYieldxyzProducts$, {
  status: "loading",
  data: [],
})

export const [useYieldxyzProduct, yieldxyzProduct$] = bind(
  (yieldId: string | null | undefined) =>
    yieldxyzProducts$.pipe(
      map((loadable) => {
        if (!yieldId) return { status: "success", data: null } as Loadable<YieldDto | null>
        const product = loadable.data?.find((p) => p.id === yieldId) || null
        return { ...loadable, data: product } as Loadable<YieldDto | null>
      }),
    ),
  { status: "loading", data: null },
)

// Add new observable for grouped yield balances using bind()
const rawYieldxyzPositions$ = new Observable<Loadable<YieldxyzPosition[]>>((subscriber) => {
  const unsubscribe = api.yieldxyzPositionsSubscribe((loadable: Loadable<YieldxyzPosition[]>) => {
    subscriber.next(loadable)
  })

  return () => unsubscribe()
}).pipe(
  debugObservable("rawYieldxyzPositions$", true),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [useYieldxyzPositionsEnhanced, yieldxyzPositionsEnhanced$] = bind(
  combineLatest([rawYieldxyzPositions$, rawYieldxyzProducts$]).pipe(
    map(([positionsLoadable, productsLoadable]) => {
      const status =
        positionsLoadable.status === "loading" || productsLoadable.status === "loading"
          ? "loading"
          : "success"
      const data =
        positionsLoadable.data && productsLoadable.data
          ? enhanceYieldxyzPositions(positionsLoadable.data, productsLoadable.data)
          : undefined

      return { status, data } as Loadable<YieldxyzPositionEnhanced[]>
    }),
  ),
  {
    status: "loading",
    data: [],
  },
)

export const [useYieldNetworkIdToTalismanNetworkIdMap, yieldNetworkIdToTalismanNetworkIdMap$] =
  bind(remoteConfig$.pipe(map(getYieldxyzNetworkIdToTalismanNetworkIdMap)))

export const [useTalismanNetworkIdFromYieldNetworkId, getTalismanNetworkIdFromYieldNetworkId$] =
  bind(
    (yieldNetworkId: Networks | null | undefined) =>
      yieldNetworkIdToTalismanNetworkIdMap$.pipe(
        map((map) => map[yieldNetworkId as Networks] ?? null),
      ),
    null,
  )

export const [useTalismanNetworkIdToYieldNetworkIdMap, talismanNetworkIdToYieldNetworkIdMap$] =
  bind(remoteConfig$.pipe(map(getTalismanNetworkIdToYieldxyzNetworkIdMap)))

export const [useYieldNetworkIdFromTalismanNetworkId, getYieldNetworkIdFromTalismanNetworkId$] =
  bind(
    (talismanNetworkId: NetworkId | null | undefined) =>
      talismanNetworkIdToYieldNetworkIdMap$.pipe(
        map((map) => map[talismanNetworkId as NetworkId] ?? null),
      ),
    null,
  )

export type YieldxyzPositionEnhanced = YieldxyzPosition & {
  totalAmountUsd: number
  product: YieldDto
}

const enhanceYieldxyzPositions = (
  positions: YieldxyzPosition[],
  products: YieldDto[],
): YieldxyzPositionEnhanced[] => {
  const productById = keyBy(products, (p) => p.id)

  return positions
    .map((position): YieldxyzPositionEnhanced | null => {
      const product = productById[position.yieldId]
      if (!product) return null

      const totalAmountUsd = position.balances.reduce(
        (sum, b) => sum + parseFloat(b.amountUsd || "0"),
        0,
      )

      return { ...position, totalAmountUsd, product }
    })
    .filter(isNotNil)
}
