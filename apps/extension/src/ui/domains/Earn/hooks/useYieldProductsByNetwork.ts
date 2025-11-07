import { bind } from "@react-rxjs/core"
import { getQuery$ } from "@talismn/util"
import {
  fetchYieldProductsByNetwork,
  getCachedProductsForNetwork,
  Networks,
  updateProductsForNetwork,
  YieldDto,
  yieldProductsStore$,
} from "extension-core"
import {
  defer,
  firstValueFrom,
  map,
  Observable,
  shareReplay,
  startWith,
  switchMap,
  throttleTime,
} from "rxjs"

const REFRESH_INTERVAL_PRODUCTS = 60_000 // 1 minute

// Observable for yield products by network
const getYieldProductsByNetwork$ = (network: Networks, tokenAddresses: string[]) => {
  if (!network || tokenAddresses.length === 0) {
    return new Observable<{
      status: "loading" | "success" | "error"
      data: YieldDto[]
      error?: unknown
    }>((subscriber) => {
      subscriber.next({ status: "loading", data: [] })
    })
  }

  const sortedAddresses = [...tokenAddresses].sort()

  // Load cached data from store and show it immediately
  return defer(() =>
    firstValueFrom(yieldProductsStore$).then((store) => {
      const cachedProducts = getCachedProductsForNetwork(store, network)
      // Filter cached products by token addresses/symbols
      const tokenIdentifiers = new Set(sortedAddresses.map((addr) => addr.toLowerCase()))
      return cachedProducts.filter((product) =>
        product.inputTokens?.some((inputToken) => {
          const symbol = inputToken.symbol?.toLowerCase()
          const address = inputToken.address?.toLowerCase()
          return tokenIdentifiers.has(symbol) || tokenIdentifiers.has(address ?? "")
        }),
      )
    }),
  ).pipe(
    switchMap((cachedProducts) => {
      // Start with cached data if available
      const initialData = cachedProducts.length > 0 ? cachedProducts : []

      return getQuery$({
        namespace: "yield-products-by-network",
        args: { network, tokenAddresses: sortedAddresses },
        queryFn: async ({ network, tokenAddresses }, signal) => {
          const products = await fetchYieldProductsByNetwork(network, tokenAddresses)
          if (!signal.aborted) {
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
 * Hook to fetch yield products for multiple tokens on a specific network
 * Uses RxJS observables for caching and error handling (matching Portfolio pattern)
 * Batches API calls by network instead of per-token
 */
export const [useYieldProductsByNetwork] = bind(
  (network: Networks, tokenAddresses: string[]) =>
    getYieldProductsByNetwork$(network, tokenAddresses),
  { status: "loading" as const, data: [] as YieldDto[] },
)
