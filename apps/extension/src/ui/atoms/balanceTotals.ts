import { balanceTotalsStore } from "@core/domains/balances/store.BalanceTotals"
import { BalanceTotal } from "@core/domains/balances/types"
import { log } from "@core/log"
import { atom } from "recoil"

export const balanceTotalsState = atom<BalanceTotal[]>({
  key: "balanceTotalsState",
  effects: [
    ({ setSelf }) => {
      log.debug("balanceTotalsState.init")

      const sub = balanceTotalsStore.observable.subscribe((v) => {
        setSelf(Object.values(v))
      })

      return () => sub.unsubscribe()
    },
  ],
})
