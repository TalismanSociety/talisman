import type { ConfirmedExternalAddresses } from "@core/domains/sendFunds/types"
import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { Observable, shareReplay } from "rxjs"

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
  shareReplay({ bufferSize: 1, refCount: true })
)

const [useConfirmedAddresses, _confirmedAddresses$] = bind(confirmedAddressesRaw$, {})

export { useConfirmedAddresses }
