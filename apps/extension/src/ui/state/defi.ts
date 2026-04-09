import type { DefiPosition } from "@core/domains/defi/exports"
import { bind } from "@react-rxjs/core"
import type { Loadable } from "@talismn/util"
import { api } from "@ui/api"
import { map, Observable, ReplaySubject } from "rxjs"

const DEFAULT_DEFI_POSITIONS: Loadable<DefiPosition[]> = {
  status: "loading",
  data: [],
}

const subjectRawDefiPositions$ = new ReplaySubject<Loadable<DefiPosition[]>>(1)

const rawDefiPositions$ = new Observable<Loadable<DefiPosition[]>>((subscriber) => {
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

export const [useDefiPosition] = bind(
  (id: string | null | undefined) =>
    defiPositions$.pipe(
      map((loadable) => loadable.data?.find((position) => position.id === id) ?? null)
    ),
  null
)
