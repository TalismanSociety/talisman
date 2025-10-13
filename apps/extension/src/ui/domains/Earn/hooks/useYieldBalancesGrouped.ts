import { bind } from "@react-rxjs/core"
import { Loadable } from "@talismn/util"
import { YieldPosition } from "extension-core"
import { Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

const DEFAULT_YIELD_BALANCES_GROUPED: Loadable<YieldPosition[]> = {
  status: "loading",
  data: [],
}

const rawYieldBalancesGrouped$ = new Observable<Loadable<YieldPosition[]>>((subscriber) => {
  const unsubscribe = api.yieldBalancesGroupedSubscribe((loadable: Loadable<YieldPosition[]>) => {
    subscriber.next(loadable)
  })

  return () => {
    unsubscribe()
  }
})

export const [useYieldBalancesGrouped, yieldBalancesGrouped$] = bind(
  rawYieldBalancesGrouped$.pipe(shareReplay({ bufferSize: 1, refCount: true })),
  DEFAULT_YIELD_BALANCES_GROUPED,
)
