import { bind } from "@react-rxjs/core"
import { Loadable } from "@talismn/util"
import { YieldPosition } from "extension-core"
import { Observable, ReplaySubject, shareReplay } from "rxjs"

import { api } from "@ui/api"

const DEFAULT_YIELD_BALANCES_GROUPED: Loadable<YieldPosition[]> = {
  status: "loading",
  data: [],
}

// Cache yield balances once fetched so they can be displayed instantly
const rawYieldBalancesCache$ = new ReplaySubject<Loadable<YieldPosition[]>>(1)

const rawYieldBalancesGrouped$ = new Observable<Loadable<YieldPosition[]>>((subscriber) => {
  const unsubscribe = api.yieldBalancesGroupedSubscribe((loadable: Loadable<YieldPosition[]>) => {
    rawYieldBalancesCache$.next(loadable) // Cache immediately like Portfolio
  })

  const subscription = rawYieldBalancesCache$.subscribe(subscriber)

  return () => {
    unsubscribe()
    subscription.unsubscribe()
  }
})

export const [useYieldBalancesGrouped, yieldBalancesGrouped$] = bind(
  rawYieldBalancesGrouped$.pipe(shareReplay({ bufferSize: 1, refCount: true })),
  DEFAULT_YIELD_BALANCES_GROUPED,
)
