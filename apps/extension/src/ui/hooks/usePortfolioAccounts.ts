import { accountsCatalogState, accountsQuery, balanceTotalsState, settingQuery } from "@ui/atoms"
import { selector, useRecoilValue, waitForAll } from "recoil"

const portfolioAccountsState = selector({
  key: "portfolioAccountsState",
  get: ({ get }) => {
    const [accounts, ownedAccounts, portfolioAccounts, catalog, currency, allBalanceTotals] = get(
      waitForAll([
        accountsQuery("all"),
        accountsQuery("owned"),
        accountsQuery("portfolio"),
        accountsCatalogState,
        settingQuery("selectedCurrency"),
        balanceTotalsState,
      ])
    )

    const balanceTotals = allBalanceTotals.filter((b) => b.currency === currency)

    const totalPerAddress = Object.fromEntries(balanceTotals.map((t) => [t.address, t.total]))
    const balanceTotalPerAccount = Object.fromEntries(
      accounts.map((a) => [a.address, totalPerAddress[a.address] ?? 0])
    )

    const portfolioTotal = portfolioAccounts.reduce(
      (total, acc) => total + balanceTotalPerAccount[acc.address] ?? 0,
      0
    )

    const ownedTotal = ownedAccounts.reduce(
      (total, acc) => total + balanceTotalPerAccount[acc.address] ?? 0,
      0
    )

    return {
      accounts,
      ownedAccounts,
      catalog,
      balanceTotals,
      currency,
      balanceTotalPerAccount,
      portfolioTotal,
      ownedTotal,
    }
  },
})

export const usePortfolioAccounts = () => useRecoilValue(portfolioAccountsState)
