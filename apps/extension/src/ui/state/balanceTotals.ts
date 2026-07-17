import { bind } from "@react-rxjs/core"
import type { Balance } from "@talismn/balances"
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
      // single pass over all balances instead of an O(balances) scan per account
      const byAddress = new Map<string, Balance[]>()
      for (const balance of balances.each) {
        const list = byAddress.get(balance.address)
        if (list) list.push(balance)
        else byAddress.set(balance.address, [balance])
      }

      const sumTotalFiat = (accountBalances: Balance[]) => {
        // mirror-token filtering is scoped to the account's own balances,
        // matching balances.find({ address }).sum.fiat(currency).total
        const tokenIds = new Set(accountBalances.map((b) => b.tokenId))
        let total = 0
        for (const balance of accountBalances) {
          const mirrorOf = balance.token?.mirrorOf
          if (mirrorOf && tokenIds.has(mirrorOf)) continue
          total += balance.total.fiat(currency) ?? 0
        }
        return total
      }

      return fromPairs(
        accounts.map(({ address }) => [address, sumTotalFiat(byAddress.get(address) ?? [])])
      )
    })
  ),
  {}
)
