import { bind } from "@react-rxjs/core"
import { combineLatest, map } from "rxjs"

import {
  accountsCatalog$,
  balanceTotals$,
  getAccountsByCategory$,
  getSettingValue$,
} from "@ui/state"

export const [usePortfolioAccounts, portfolioAccounts$] = bind(
  combineLatest([
    getAccountsByCategory$("all"),
    getAccountsByCategory$("owned"),
    getAccountsByCategory$("portfolio"),
    accountsCatalog$,
    getSettingValue$("selectedCurrency"),
    balanceTotals$,
  ]).pipe(
    map(([accounts, ownedAccounts, portfolioAccounts, catalog, currency, allBalanceTotals]) => {
      const balanceTotals = allBalanceTotals.filter((b) => b.currency === currency)

      const totalPerAddress = Object.fromEntries(balanceTotals.map((t) => [t.address, t.total]))
      const balanceTotalPerAccount = Object.fromEntries(
        accounts.map((a) => [a.address, totalPerAddress[a.address] ?? 0]),
      )

      const portfolioTotal = portfolioAccounts.reduce(
        (total, acc) => total + (balanceTotalPerAccount[acc.address] ?? 0),
        0,
      )

      const ownedTotal = ownedAccounts.reduce(
        (total, acc) => total + (balanceTotalPerAccount[acc.address] ?? 0),
        0,
      )

      return {
        accounts,
        ownedAccounts,
        portfolioAccounts,
        catalog,
        balanceTotals,
        currency,
        balanceTotalPerAccount,
        portfolioTotal,
        ownedTotal,
      }
    }),
  ),
)
