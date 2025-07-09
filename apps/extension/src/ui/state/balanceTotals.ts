import { bind } from "@react-rxjs/core"
import { balanceTotalsStore } from "extension-core"
import { values } from "lodash"
import { map } from "rxjs"

export const [useBalanceTotals, balanceTotals$] = bind(
  balanceTotalsStore.observable.pipe(map((v) => values(v))),
)
