import { bind } from "@react-rxjs/core"
import { accountsCatalog$, getAccountsByCategory$ } from "@ui/state/accounts"
import { balanceTotals$ } from "@ui/state/balanceTotals"
import { getSettingValue$ } from "@ui/state/settings"
import { combineLatest, map } from "rxjs"

export const [usePortfolioAccounts, portfolioAccounts$] = bind(
  combineLatest([
    getAccountsByCategory$("all"),
    getAccountsByCategory$("owned"),
    getAccountsByCategory$("portfolio"),
    accountsCatalog$,
    getSettingValue$("selectedCurrency"),
    balanceTotals$,
  ]).pipe(
    map(([accounts, ownedAccounts, portfolioAccounts, catalog, currency, balanceTotals]) => {
      const portfolioTotal = portfolioAccounts.reduce(
        (total, { address }) => (balanceTotals[address] ?? 0) + total,
        0
      )

      return {
        accounts,
        ownedAccounts,
        portfolioAccounts,
        catalog,
        currency,
        balanceTotals,
        portfolioTotal,
      }
    })
  ),
  // default value to prevent bind() from keeping a subscription on balances
  {
    accounts: [],
    ownedAccounts: [],
    portfolioAccounts: [],
    catalog: { portfolio: [], watched: [] },
    currency: "usd",
    balanceTotals: {},
    portfolioTotal: 0,
  }
)
