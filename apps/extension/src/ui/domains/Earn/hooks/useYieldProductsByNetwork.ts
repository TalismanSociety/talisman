import { bind } from "@react-rxjs/core"
import { getQuery$ } from "@talismn/util"
import { fetchYieldProductsByNetwork, Networks, YieldDto } from "extension-core"
import { map, Observable, shareReplay, throttleTime } from "rxjs"

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

  return getQuery$({
    namespace: "yield-products-by-network",
    args: { network, tokenAddresses: sortedAddresses },
    queryFn: async ({ network, tokenAddresses }) => {
      return await fetchYieldProductsByNetwork(network, tokenAddresses)
    },
    refreshInterval: REFRESH_INTERVAL_PRODUCTS,
    defaultValue: [],
  }).pipe(
    map((result) => {
      if (result.status === "loaded") {
        return { status: "success" as const, data: result.data }
      }
      if (result.status === "error") {
        return { status: "error" as const, data: [], error: result.error }
      }
      return { status: "loading" as const, data: [] }
    }),
    throttleTime(200, undefined, { leading: true, trailing: true }),
    shareReplay({ bufferSize: 1, refCount: true }),
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
