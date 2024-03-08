import { BalanceTotal } from "@extension/core"
import { balanceTotalsStore } from "@extension/core"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const balanceTotalsAtom = atomWithSubscription<BalanceTotal[]>((callback) => {
  const { unsubscribe } = balanceTotalsStore.observable.subscribe((v) => callback(Object.values(v)))
  return unsubscribe
}, "balanceTotalsAtom")
