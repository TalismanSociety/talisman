import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { DbTokenRates } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { db } from "extension-core"
import { from, map, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

import { debugObservable } from "./util/debugObservable"

export const tokenRates$ = new Observable<DbTokenRates[]>((subscriber) => {
  // sync data from db
  const sub = from(liveQuery(() => db.tokenRates.toArray())).subscribe(subscriber)
  // keep data up to date
  const unsubscribe = api.tokenRates(() => {})

  return () => {
    sub.unsubscribe()
    unsubscribe()
  }
}).pipe(debugObservable("tokenRates$"), shareReplay(1))

export const [useTokenRatesMap, tokenRatesMap$] = bind(
  tokenRates$.pipe(
    map((tokenRates) =>
      Object.fromEntries(tokenRates.map(({ tokenId, rates }) => [tokenId, rates]))
    )
  )
)

export const [useTokenRates, getTokenRates$] = bind((tokenId: TokenId | null | undefined) =>
  tokenRatesMap$.pipe(
    map((tokenRatesMap) => {
      if (!tokenId) return null
      return tokenRatesMap[tokenId] ?? null
    })
  )
)
