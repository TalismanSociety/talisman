import { bind } from "@react-rxjs/core"
import { getDTaoTokenRates } from "@talismn/balances"
import type { DotNetworkId, TokenId } from "@talismn/chaindata-provider"
import type { TokenRatesStorage } from "@talismn/token-rates"
import { api } from "@ui/api"
import { taoDataApi } from "@ui/domains/Staking/hooks/bittensor/dTao/taoDataApi"
import { BITTENSOR_NETWORK_ID } from "@ui/domains/TaoDashboard/subnets/constants"
import {
  catchError,
  combineLatest,
  EMPTY,
  from,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  timer,
} from "rxjs"
import { Struct, u16, u64, Vector } from "scale-ts"

import { getToken$ } from "./chaindata"
import { debugObservable } from "./util/debugObservable"

export const tokenRates$ = new Observable<TokenRatesStorage>((subscriber) => {
  const unsubscribe = api.tokenRates((rates) => {
    subscriber.next(rates)
  })

  return () => {
    unsubscribe()
  }
}).pipe(debugObservable("tokenRates$"), shareReplay(1))

export const [useTokenRatesMap, tokenRatesMap$] = bind(
  tokenRates$.pipe(map((tokenRates) => tokenRates.tokenRates))
)

const SCALED_ALPHA_PRICES_REFRESH_INTERVAL = 60_000

// decoded shape of the SwapRuntimeApi_current_alpha_price_all result
const alphaPricesCodec = Vector(Struct({ netuid: u16, price: u64 }))

const scaledAlphaPricesCache = new Map<DotNetworkId, Observable<Map<number, bigint>>>()

/**
 * Current TAO-per-alpha pool price of every subnet of a network, keyed by netuid, in rao — the
 * scaledAlphaPrice fixed-point format. A single `SwapRuntimeApi.current_alpha_price_all`
 * state_call covers all subnets at once, shared by every subscriber and refreshed every minute
 * while subscribed; its argless (-> Vec<(u16, u64)>) signature is trivial enough to hand-decode,
 * sparing a full ScaleApi (which would download the chain metadata). Emits null until the first
 * call lands, and holds the last prices through failed refreshes.
 */
const getScaledAlphaPrices$ = (networkId: DotNetworkId): Observable<Map<number, bigint> | null> => {
  // bittensor mainnet only: no other network is expected to serve this runtime api
  if (networkId !== BITTENSOR_NETWORK_ID) return of(null)

  let prices$ = scaledAlphaPricesCache.get(networkId)

  if (!prices$) {
    prices$ = timer(0, SCALED_ALPHA_PRICES_REFRESH_INTERVAL).pipe(
      switchMap(() =>
        from(
          api.subSend<string>(networkId, "state_call", [
            "SwapRuntimeApi_current_alpha_price_all",
            "0x",
          ])
        ).pipe(
          map(
            (result) =>
              new Map(
                alphaPricesCodec
                  .dec(result)
                  .map(({ netuid, price }): [number, bigint] => [netuid, price])
              )
          ),
          // skip the emission: the last successful prices stay current, retried next tick
          catchError(() => EMPTY)
        )
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    )
    scaledAlphaPricesCache.set(networkId, prices$)
  }

  // null upfront, per subscriber rather than baked into the shared pipeline: a first value must
  // not wait on the chain call, and a resubscription must not flash null over replayed prices
  return prices$.pipe(startWith(null))
}

const ALPHA_PRICE_CHANGES_REFRESH_INTERVAL = 5 * 60_000

/**
 * 24h percent change of every subnet pool price (alpha vs TAO), keyed by netuid, from the
 * tao-data api — the chain knows the current pool prices but not yesterday's. Shared and
 * refreshed like getScaledAlphaPrices$; holds the last values through failed refreshes.
 */
const alphaPriceChanges$: Observable<Map<number, number>> = timer(
  0,
  ALPHA_PRICE_CHANGES_REFRESH_INTERVAL
).pipe(
  switchMap(() =>
    from(taoDataApi.pools.listPools()).pipe(
      map(
        (response) =>
          new Map(
            response.data
              .map((pool): [number, number] => [pool.netuid, Number(pool.price_change_1_day)])
              .filter(([, change]) => Number.isFinite(change))
          )
      ),
      // skip the emission: the last successful values stay current, retried next tick
      catchError(() => EMPTY)
    )
  ),
  shareReplay({ bufferSize: 1, refCount: true })
)

/**
 * Rates for any token, in all supported currencies.
 *
 * dtao (subnet alpha) tokens of bittensor mainnet are priced from their subnet pool combined with
 * the TAO rates; every other token resolves from the coingecko-keyed store.
 */
export const [useTokenRates, getTokenRates$] = bind((tokenId: TokenId | null | undefined) =>
  combineLatest([tokenRatesMap$, getToken$(tokenId)]).pipe(
    switchMap(([tokenRatesMap, token]) => {
      const rawRates = (tokenId ? tokenRatesMap[tokenId] : null) ?? null

      if (token?.type === "substrate-dtao" && token.networkId === BITTENSOR_NETWORK_ID)
        return combineLatest([
          getScaledAlphaPrices$(token.networkId),
          // same reasoning as the startWith inside getScaledAlphaPrices$: never block the rates
          alphaPriceChanges$.pipe(startWith(null)),
        ]).pipe(
          map(([scaledAlphaPrices, alphaPriceChanges]) => {
            const scaledAlphaPrice = scaledAlphaPrices?.get(token.netuid)
            return scaledAlphaPrice
              ? (getDTaoTokenRates(
                  token,
                  tokenRatesMap,
                  scaledAlphaPrice,
                  alphaPriceChanges?.get(token.netuid)
                ) ?? rawRates)
              : rawRates
          })
        )

      return of(rawRates)
    })
  )
)
