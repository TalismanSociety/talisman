import { BalanceTotal, balanceTotalsStore } from "@extension/core"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const balanceTotalsAtom = atomWithSubscription<BalanceTotal[]>(
  (callback) => {
    const sub = balanceTotalsStore.observable.subscribe((v) => callback(Object.values(v)))
    return () => sub.unsubscribe()
  },
  { debugLabel: "balanceTotalsAtom" }
)
