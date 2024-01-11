import { log } from "@core/log"
import { accountsCatalogState, accountsState, balanceTotalsState, settingQuery } from "@ui/atoms"
import { selector, useRecoilValue } from "recoil"

let stop: null | (() => void) = null

const portfolioAccountsState = selector({
  key: "portfolioAccountsState",
  get: ({ get }) => {
    if (!stop) stop = log.timer("portfolioAccountsState")
    const accounts = get(accountsState)
    const catalog = get(accountsCatalogState)
    const currency = get(settingQuery("selectedCurrency"))
    const balanceTotals = get(balanceTotalsState).filter((b) => b.currency === currency)

    const sumPerAddress = Object.fromEntries(
      balanceTotals.filter((t) => t.currency === currency).map((t) => [t.address, t.total])
    )
    const balanceTotalPerAccount = Object.fromEntries(
      accounts.map((a) => [a.address, sumPerAddress[a.address] ?? 0])
    )

    const portfolioTotal = accounts
      .filter((acc) => acc.isPortfolio !== false)
      .reduce((total, acc) => total + balanceTotalPerAccount[acc.address] ?? 0, 0)

    return { accounts, catalog, balanceTotals, currency, balanceTotalPerAccount, portfolioTotal }
  },
})

export const usePortfolioAccounts = () => {
  return useRecoilValue(portfolioAccountsState)
}
