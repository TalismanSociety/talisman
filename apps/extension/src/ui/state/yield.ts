import { bind } from "@react-rxjs/core"
import { NetworkId } from "@talismn/chaindata-provider"
import { Loadable } from "@talismn/util"
import {
  createYieldxyzPositions,
  getTalismanNetworkIdToYieldxyzNetworkIdMap,
  getYieldxyzNetworkIdToTalismanNetworkIdMap,
  Networks,
  YieldDto,
  YieldxyzPosition,
  YieldxyzProvider,
} from "extension-core"
import { log } from "extension-shared"
import { map, Observable, shareReplay } from "rxjs"

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
    log.debug("[frontend] Unsubscribing from api.yieldxyzOpportunitiesSubscribe")
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
const rawYieldxyzOpportunities$ = new Observable<Loadable<YieldDto[]>>((subscriber) => {
  // TODO rename to yieldPositionsSubscribe, or earn
  const unsubscribe = api.yieldxyzOpportunitiesSubscribe((loadable: Loadable<YieldDto[]>) => {
    subscriber.next(loadable)
  })

  return () => {
    // TODO remove after unsubscribe works
    log.debug("[frontend] Unsubscribing from api.yieldxyzOpportunitiesSubscribe")
    unsubscribe()
  }
}).pipe(
  debugObservable("rawYieldxyzOpportunities$", true),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [useYieldxyzOpportunities, yieldxyzOpportunities$] = bind(rawYieldxyzOpportunities$, {
  status: "loading",
  data: [],
})

// Add new observable for grouped yield balances using bind()
const rawYieldxyzPositions$ = new Observable<Loadable<YieldxyzPosition[]>>((subscriber) => {
  // TODO rename to yieldPositionsSubscribe, or earn
  const unsubscribe = api.yieldxyzPositionsSubscribe((loadable: Loadable<YieldxyzPosition[]>) => {
    subscriber.next(loadable)
  })

  return () => {
    // TODO remove after unsubscribe works
    log.debug("[frontend] Unsubscribing from api.yieldBalancesGroupedSubscribe")
    unsubscribe()
  }
}).pipe(
  debugObservable("rawYieldxyzPositions$", true),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [useYieldxyzPositionsEnhanced, yieldxyzPositionsEnhanced$] = bind(
  rawYieldxyzPositions$.pipe(
    map((loadable) => ({
      ...loadable,
      // might want to move this to where its needed
      data: loadable.data ? createYieldxyzPositions(loadable.data) : undefined,
    })),
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
