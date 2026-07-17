import { bind } from "@react-rxjs/core"
import type { TokenId } from "@talismn/chaindata-provider"
import type { TokenRatesStorage } from "@talismn/token-rates"
import { api } from "@ui/api"
import { isEqual } from "lodash-es"
import { distinctUntilChanged, map, Observable, shareReplay, throttleTime } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const tokenRates$ = new Observable<TokenRatesStorage>((subscriber) => {
  const unsubscribe = api.tokenRates((rates) => {
    subscriber.next(rates)
  })

  return () => {
    unsubscribe()
  }
}).pipe(
  debugObservable("tokenRates$"),
  // each port message deserializes to a brand-new object; downstream, a new
  // tokenRates ref invalidates the balances hydrate and with it every cached
  // Balance formatter. The background re-publishes rates on token/network
  // activation changes (asset-discovery storms) with mostly identical content,
  // so collapse bursts and drop content-identical emissions here.
  throttleTime(2_000, undefined, { leading: true, trailing: true }),
  distinctUntilChanged<TokenRatesStorage>(isEqual),
  shareReplay(1)
)

export const [useTokenRatesMap, tokenRatesMap$] = bind(
  tokenRates$.pipe(map((tokenRates) => tokenRates.tokenRates))
)

/**
 * Rates for any token, in all supported currencies.
 *
 * dtao (subnet alpha) tokens are priced by the background token-rates store (subnet pool
 * price combined with the TAO rates); every other token resolves from the coingecko store —
 * both land in the same list, keyed by tokenId.
 */
export const [useTokenRates, getTokenRates$] = bind((tokenId: TokenId | null | undefined) =>
  tokenRatesMap$.pipe(map((tokenRatesMap) => (tokenId ? (tokenRatesMap[tokenId] ?? null) : null)))
)
