import { bind } from "@react-rxjs/core"
import { Loadable } from "@talismn/util"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import {
  fetchYieldProducts,
  YieldPosition,
  YieldsControllerGetYieldsParamsExtended,
} from "extension-core"
import { BehaviorSubject, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

// Add new observable for grouped yield balances using bind()
const rawYieldBalancesGrouped$ = new Observable<Loadable<YieldPosition[]>>((subscriber) => {
  const unsubscribe = api.yieldBalancesGroupedSubscribe((loadable: Loadable<YieldPosition[]>) => {
    subscriber.next(loadable)
  })

  return () => {
    unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

export const [useYieldBalancesGrouped, yieldBalancesGrouped$] = bind(rawYieldBalancesGrouped$, {
  status: "loading",
  data: [],
})

/**
 * Hook to fetch yield products for earning opportunities
 * Uses React Query for caching and error handling
 */
export const useYieldProducts = (filter?: YieldsControllerGetYieldsParamsExtended) => {
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

/**
 * Hook to fetch yield products with infinite pagination
 * Fetches 20 items per page for better performance
 */
export const useInfiniteYieldProducts = (
  filter?: Omit<YieldsControllerGetYieldsParamsExtended, "limit" | "offset">,
) => {
  return useInfiniteQuery({
    queryKey: ["infiniteYieldProducts", filter],
    queryFn: ({ pageParam = 0 }) =>
      fetchYieldProducts({
        ...filter,
        limit: 20,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If we got less than 20 items, we've reached the end
      if (lastPage.length < 20) {
        return undefined
      }
      // Return next offset (current offset + 20)
      return allPages.length * 20
    },
    enabled: !!filter?.network, // Only fetch when network name is available
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 1 * 60 * 1000, // Refetch every 1 minute for fresh APY data
    refetchOnWindowFocus: false,
    retry: 2,
  })
}

/**
 * Hook to fetch yield products for a specific token with infinite pagination
 * Fetches 20 items per page for better performance
 */
export const useInfiniteYieldProductsForToken = (
  tokenIdentifier: string,
  network?: Omit<
    YieldsControllerGetYieldsParamsExtended,
    "limit" | "offset" | "inputTokens"
  >["network"],
) => {
  return useInfiniteQuery({
    queryKey: ["infiniteYieldProductsForToken", tokenIdentifier, network],
    queryFn: ({ pageParam = 0 }) =>
      fetchYieldProducts({
        network,
        inputTokens: tokenIdentifier,
        limit: 100,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If we got less than 100 items, we've reached the end
      if (lastPage.length < 100) {
        return undefined
      }
      // Return next offset (current offset + 100)
      return allPages.length * 100
    },
    enabled: !!tokenIdentifier && !!network, // Only fetch when token and network are available
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

// Discover tab search state (separate from assets tab search)
const subjectDiscoverSearch$ = new BehaviorSubject<string>("")

export const [useDiscoverSearch, discoverSearch$] = bind(subjectDiscoverSearch$)

export const setDiscoverSearch = (search: string) => subjectDiscoverSearch$.next(search)
