import { bind } from "@react-rxjs/core"
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
    map(({ accounts, balances, currency }) =>
      fromPairs(
        accounts.map(({ address }) => [
          address,
          balances.find({ address }).sum.fiat(currency).total,
        ]),
      ),
    ),
  ),
  {},
)
