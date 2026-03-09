import { bind } from "@react-rxjs/core"
import type { TokenId } from "@talismn/chaindata-provider"
import type { TokenRatesStorage } from "@talismn/token-rates"
import { api } from "@ui/api"
import { map, Observable, shareReplay, throttleTime } from "rxjs"

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
  throttleTime(2_000, undefined, { leading: true, trailing: true }),
  shareReplay(1)
)

export const [useTokenRatesMap, tokenRatesMap$] = bind(
  tokenRates$.pipe(map((tokenRates) => tokenRates.tokenRates))
)

export const [useTokenRates, getTokenRates$] = bind((tokenId: TokenId | null | undefined) =>
  tokenRatesMap$.pipe(
    map((tokenRatesMap) => {
      if (!tokenId) return null
      return tokenRatesMap[tokenId] ?? null
    })
  )
)
