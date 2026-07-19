import { bind } from "@react-rxjs/core"
import { type Balance, Balances } from "@talismn/balances"
import { fromPairs } from "lodash-es"
import { combineLatest, map } from "rxjs"

import { accounts$ } from "./accounts"
import { getBalances$ } from "./balances"
import { getSettingValue$ } from "./settings"

export const [useBalanceTotals, balanceTotals$] = bind(
  combineLatest({
    accounts: accounts$,
    balances: getBalances$(),
    currency: getSettingValue$("selectedCurrency"),
  }).pipe(
    map(({ accounts, balances, currency }) => {
      // group in a single pass instead of an O(balances) scan per account
      const byAddress = new Map<string, Balance[]>()
      for (const balance of balances.each) {
        const list = byAddress.get(balance.address)
        if (list) list.push(balance)
        else byAddress.set(balance.address, [balance])
      }

      return fromPairs(
        accounts.map(({ address }) => [
          address,
          new Balances(byAddress.get(address) ?? []).sum.fiat(currency).total,
        ])
      )
    })
  ),
  {}
)
