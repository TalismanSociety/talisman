import { bind } from "@react-rxjs/core"
import { getQuery$, Loadable } from "@talismn/util"
import {
  fetchYieldProducts,
  getCachedProductsForNetwork,
  updateProductsForNetwork,
  YieldDto,
  YieldPosition,
  yieldProductsStore$,
  YieldsControllerGetYieldsParamsExtended,
} from "extension-core"
import {
  BehaviorSubject,
  defer,
  firstValueFrom,
  map,
  Observable,
  ReplaySubject,
  shareReplay,
  startWith,
  switchMap,
  throttleTime,
} from "rxjs"

import { api } from "@ui/api"

const REFRESH_INTERVAL_PRODUCTS = 60_000 // 1 minute

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

// Cache yield products once fetched so they can be displayed instantly if navigating in and out of earn
const rawYieldProductsCache$ = new ReplaySubject<YieldDto[]>(1)

// Observable for yield products with filter
const getYieldProducts$ = (filter?: YieldsControllerGetYieldsParamsExtended) => {
  if (!filter?.network) {
    return new Observable<{
      status: "loading" | "success" | "error"
      data: YieldDto[]
      error?: unknown
    }>((subscriber) => {
      subscriber.next({ status: "loading", data: [] })
    })
  }

  const network = filter.network

  // Load cached data from store and show it immediately
  return defer(() =>
    firstValueFrom(yieldProductsStore$).then((store) =>
      getCachedProductsForNetwork(store, network),
    ),
  ).pipe(
    switchMap((cachedProducts) => {
      // Start with cached data if available
      const initialData = cachedProducts.length > 0 ? cachedProducts : []

      return getQuery$({
        namespace: "yield-products",
        args: filter,
        queryFn: async (filter, signal) => {
          const products = await fetchYieldProducts(filter)
          if (!signal.aborted) {
            rawYieldProductsCache$.next(products)
            // Update store with new data
            updateProductsForNetwork(network, products)
          }
          return products
        },
        refreshInterval: REFRESH_INTERVAL_PRODUCTS,
        defaultValue: [],
      }).pipe(
        startWith({
          status: "loading" as const,
          data: initialData,
          error: undefined,
        }),
        map((result) => {
          if (result.status === "loaded") {
            return { status: "success" as const, data: result.data }
          }
          if (result.status === "error") {
            return { status: "error" as const, data: initialData, error: result.error }
          }
          // If loading but we have cached data, show it
          return { status: "loading" as const, data: initialData }
        }),
        throttleTime(200, undefined, { leading: true, trailing: true }),
        shareReplay({ bufferSize: 1, refCount: true }),
      )
    }),
  )
}

/**
 * Hook to fetch yield products for earning opportunities
 * Uses RxJS observables for caching and error handling (matching Portfolio pattern)
 */
export const [useYieldProducts] = bind(
  (filter?: YieldsControllerGetYieldsParamsExtended) => getYieldProducts$(filter),
  { status: "loading" as const, data: [] as YieldDto[] },
)

// Observable for infinite yield products (paginated)
const getInfiniteYieldProducts$ = (
  filter?: Omit<YieldsControllerGetYieldsParamsExtended, "limit" | "offset">,
) => {
  if (!filter?.network) {
    return new Observable<{ pages: YieldDto[][] }>((subscriber) => {
      subscriber.next({ pages: [] })
    })
  }

  const network = filter.network
  const limit = 20

  // Load cached data from store and show it immediately
  return defer(() =>
    firstValueFrom(yieldProductsStore$).then((store) =>
      getCachedProductsForNetwork(store, network),
    ),
  ).pipe(
    switchMap((cachedProducts) => {
      // Convert cached products to pages structure
      const cachedPages: YieldDto[][] = []
      for (let i = 0; i < cachedProducts.length; i += limit) {
        cachedPages.push(cachedProducts.slice(i, i + limit))
      }

      // For infinite pagination, we'll fetch all pages and return them as a single observable
      // This matches the Portfolio pattern of fetching all data upfront
      return getQuery$({
        namespace: "yield-products-infinite",
        args: filter,
        queryFn: async (filter, signal) => {
          const allProducts: YieldDto[] = []
          let offset = 0
          let hasMore = true

          while (hasMore && !signal.aborted) {
            const page = await fetchYieldProducts({
              ...filter,
              limit,
              offset,
            })
            allProducts.push(...page)
            hasMore = page.length === limit
            if (hasMore) offset += limit
          }

          // Update store with new data
          if (!signal.aborted) {
            updateProductsForNetwork(network, allProducts)
          }

          // Return as pages structure for compatibility
          const pages: YieldDto[][] = []
          for (let i = 0; i < allProducts.length; i += limit) {
            pages.push(allProducts.slice(i, i + limit))
          }
          return pages
        },
        refreshInterval: REFRESH_INTERVAL_PRODUCTS,
        defaultValue: [],
      }).pipe(
        startWith({
          status: "loading" as const,
          data: cachedPages,
          error: undefined,
        }),
        map((result) => {
          if (result.status === "loaded") {
            return { pages: result.data }
          }
          // If loading but we have cached data, show it
          return { pages: cachedPages }
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      )
    }),
  )
}

/**
 * Hook to fetch yield products with infinite pagination
 * Fetches 20 items per page for better performance
 */
export const [useInfiniteYieldProducts] = bind(
  (filter?: Omit<YieldsControllerGetYieldsParamsExtended, "limit" | "offset">) =>
    getInfiniteYieldProducts$(filter),
  { pages: [] as YieldDto[][] },
)

// Observable for infinite yield products for a specific token
const getInfiniteYieldProductsForToken$ = (
  tokenIdentifier: string,
  network?: Omit<
    YieldsControllerGetYieldsParamsExtended,
    "limit" | "offset" | "inputTokens"
  >["network"],
) => {
  if (!tokenIdentifier || !network) {
    return new Observable<{ pages: YieldDto[][]; isLoading: boolean; error: Error | null }>(
      (subscriber) => {
        subscriber.next({ pages: [], isLoading: false, error: null })
      },
    )
  }

  const limit = 100

  // Load cached data from store and show it immediately
  // For token-specific queries, we filter cached products by token
  return defer(() =>
    firstValueFrom(yieldProductsStore$).then((store) => {
      const cachedProducts = getCachedProductsForNetwork(store, network)
      // Filter cached products by token identifier
      return cachedProducts.filter((product) =>
        product.inputTokens?.some((inputToken) => {
          const symbol = inputToken.symbol?.toLowerCase()
          const address = inputToken.address?.toLowerCase()
          const identifier = tokenIdentifier.toLowerCase()
          return symbol === identifier || address === identifier
        }),
      )
    }),
  ).pipe(
    switchMap((cachedProducts) => {
      // Convert cached products to pages structure
      const cachedPages: YieldDto[][] = []
      for (let i = 0; i < cachedProducts.length; i += limit) {
        cachedPages.push(cachedProducts.slice(i, i + limit))
      }

      return getQuery$({
        namespace: "yield-products-infinite-token",
        args: { tokenIdentifier, network },
        queryFn: async ({ tokenIdentifier, network }, signal) => {
          const allProducts: YieldDto[] = []
          let offset = 0
          let hasMore = true

          while (hasMore && !signal.aborted) {
            const page = await fetchYieldProducts({
              network,
              inputTokens: tokenIdentifier,
              limit,
              offset,
            })
            allProducts.push(...page)
            hasMore = page.length === limit
            if (hasMore) offset += limit
          }

          // Update store with new data (all products for the network)
          if (!signal.aborted) {
            // Get all products for network and merge with new token-specific products
            firstValueFrom(yieldProductsStore$).then((store) => {
              const existingProducts = getCachedProductsForNetwork(store, network)
              // Merge and deduplicate by product ID
              const productMap = new Map<string, YieldDto>()
              existingProducts.forEach((p) => productMap.set(p.id, p))
              allProducts.forEach((p) => productMap.set(p.id, p))
              updateProductsForNetwork(network, Array.from(productMap.values()))
            })
          }

          // Return as pages structure for compatibility
          const pages: YieldDto[][] = []
          for (let i = 0; i < allProducts.length; i += limit) {
            pages.push(allProducts.slice(i, i + limit))
          }
          return pages
        },
        refreshInterval: REFRESH_INTERVAL_PRODUCTS,
        defaultValue: [],
      }).pipe(
        startWith({
          status: "loading" as const,
          data: cachedPages,
          error: undefined,
        }),
        map((result) => {
          if (result.status === "loaded") {
            return { pages: result.data, isLoading: false, error: null as Error | null }
          }
          if (result.status === "error") {
            const error =
              result.error instanceof Error ? result.error : new Error(String(result.error))
            return { pages: cachedPages, isLoading: false, error }
          }
          // If loading but we have cached data, show it
          return { pages: cachedPages, isLoading: true, error: null as Error | null }
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      )
    }),
  )
}

/**
 * Hook to fetch yield products for a specific token with infinite pagination
 * Fetches 100 items per page for better performance
 */
export const [useInfiniteYieldProductsForToken] = bind(
  ((
    tokenIdentifier: string,
    network?: Omit<
      YieldsControllerGetYieldsParamsExtended,
      "limit" | "offset" | "inputTokens"
    >["network"],
  ): Observable<{ pages: YieldDto[][]; isLoading: boolean; error: Error | null }> =>
    getInfiniteYieldProductsForToken$(tokenIdentifier, network)) as (
    tokenIdentifier: string,
    network?: Omit<
      YieldsControllerGetYieldsParamsExtended,
      "limit" | "offset" | "inputTokens"
    >["network"],
  ) => Observable<{ pages: YieldDto[][]; isLoading: boolean; error: Error | null }>,
  { pages: [] as YieldDto[][], isLoading: true, error: null as Error | null },
)

// Yield-specific search state (separate from portfolio search)
const subjectYieldSearch$ = new BehaviorSubject<string>("")

export const [useYieldSearch, yieldSearch$] = bind(subjectYieldSearch$)

export const setYieldSearch = (search: string) => subjectYieldSearch$.next(search)
