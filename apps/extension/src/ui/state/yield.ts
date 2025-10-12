import { bind } from "@react-rxjs/core"
import { Loadable } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import {
  fetchYieldProducts,
  YieldBalancesDtoWithProduct,
  YieldsControllerGetYieldsParams,
} from "extension-core"
import { BehaviorSubject, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

const DEFAULT_YIELD_BALANCES: Loadable<YieldBalancesDtoWithProduct[]> = {
  status: "loading",
  data: [],
}

const rawYieldBalances$ = new Observable<Loadable<YieldBalancesDtoWithProduct[]>>((subscriber) => {
  const unsubscribe = api.yieldBalancesSubscribe(
    (loadable: Loadable<YieldBalancesDtoWithProduct[]>) => {
      subscriber.next(loadable)
    },
  )

  return () => {
    unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

export const [useYieldRawBalances, yieldBalances$] = bind(
  rawYieldBalances$.pipe(shareReplay({ bufferSize: 1, refCount: true })),
  DEFAULT_YIELD_BALANCES,
)

/**
 * Hook to fetch yield products for earning opportunities
 * Uses React Query for caching and error handling
 */
export const useYieldProducts = (filter?: YieldsControllerGetYieldsParams) => {
  return useQuery({
    queryKey: ["yieldProducts", filter],
    queryFn: () => fetchYieldProducts(filter),
    enabled: !!filter?.network, // Only fetch when network name is available
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 1 * 60 * 1000, // Refetch every 1 minute for fresh APY data
    refetchOnWindowFocus: false,
    retry: 2,
  })
}

// Yield-specific search state (separate from portfolio search)
const subjectYieldSearch$ = new BehaviorSubject<string>("")

export const [useYieldSearch, yieldSearch$] = bind(subjectYieldSearch$)

export const setYieldSearch = (search: string) => subjectYieldSearch$.next(search)
