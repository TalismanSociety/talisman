import { balanceTotalsStore } from "@core/domains/balances/store.BalanceTotals"
import { BalanceTotal } from "@core/domains/balances/types"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const balanceTotalsAtom = atomWithSubscription<BalanceTotal[]>((callback) => {
  const { unsubscribe } = balanceTotalsStore.observable.subscribe((v) => callback(Object.values(v)))
  return unsubscribe
}, "balanceTotalsAtom")
