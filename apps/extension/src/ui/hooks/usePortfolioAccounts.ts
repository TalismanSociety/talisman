import {
  accountsCatalogState,
  accountsQuery,
  accountsState,
  balanceTotalsState,
  settingQuery,
} from "@ui/atoms"
import { selector, useRecoilValue } from "recoil"

const portfolioAccountsState = selector({
  key: "portfolioAccountsState",
  get: ({ get }) => {
    const accounts = get(accountsState)
    const ownedAccounts = get(accountsQuery("owned"))
    const portfolioAccounts = get(accountsQuery("portfolio"))
    const catalog = get(accountsCatalogState)
    const currency = get(settingQuery("selectedCurrency"))
    const balanceTotals = get(balanceTotalsState).filter((b) => b.currency === currency)

    const sumPerAddress = Object.fromEntries(
      balanceTotals.filter((t) => t.currency === currency).map((t) => [t.address, t.total])
    )
    const balanceTotalPerAccount = Object.fromEntries(
      accounts.map((a) => [a.address, sumPerAddress[a.address] ?? 0])
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

export const usePortfolioAccounts = () => {
  return useRecoilValue(portfolioAccountsState)
}
