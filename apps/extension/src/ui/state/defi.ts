import { bind } from "@react-rxjs/core"
import { Loadable } from "@talismn/util"
import { DefiPosition } from "extension-core"
import { Observable, ReplaySubject } from "rxjs"

import { api } from "@ui/api"

const DEFAULT_DEFI_POSITIONS: Loadable<DefiPosition[]> = {
  status: "loading",
  data: [],
}

const subjectRawDefiPositions$ = new ReplaySubject<Loadable<DefiPosition[]>>(1)

export const rawDefiPositions$ = new Observable<Loadable<DefiPosition[]>>((subscriber) => {
  const sub = subjectRawDefiPositions$.subscribe(subscriber)

  const unsubscribe = api.defiPositionsSubscribe((loadable) => {
    subjectRawDefiPositions$.next(loadable)
  })

  return () => {
    sub.unsubscribe()
    unsubscribe()
  }
})

export const [useDefiPositions, defiPositions$] = bind(rawDefiPositions$, DEFAULT_DEFI_POSITIONS)
