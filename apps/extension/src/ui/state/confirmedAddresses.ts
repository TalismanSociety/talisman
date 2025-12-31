import { bind } from "@react-rxjs/core"
import { ConfirmedExternalAddresses } from "extension-core"
import { Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

import { debugObservable } from "./util/debugObservable"

const confirmedAddressesRaw$ = new Observable<ConfirmedExternalAddresses>((subscriber) => {
  const unsubscribe = api.confirmedAddressesSubscribe((data) => {
    subscriber.next(data)
  })

  return () => {
    unsubscribe()
  }
}).pipe(
  debugObservable("confirmedAddressesRaw$", true),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [useConfirmedAddresses, confirmedAddresses$] = bind(confirmedAddressesRaw$, {})
