import { bind } from "@react-rxjs/core"
import { balanceTotalsStore } from "extension-core"
import { map, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const balanceTotals$ = balanceTotalsStore.observable.pipe(
  map((v) => Object.values(v)),
  debugObservable("balanceTotals$"),
  shareReplay(1),
)

export const [useBalanceTotals] = bind(balanceTotals$)
