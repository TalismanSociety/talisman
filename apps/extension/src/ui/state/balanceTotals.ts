import { bind } from "@react-rxjs/core"
import { balanceTotalsStore } from "extension-core"
import { map, shareReplay } from "rxjs"

export const balanceTotals$ = balanceTotalsStore.observable.pipe(
  map((v) => Object.values(v)),
  shareReplay({ bufferSize: 1, refCount: true })
)

export const [useBalanceTotals] = bind(balanceTotals$)
