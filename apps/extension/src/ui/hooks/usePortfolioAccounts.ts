import { log } from "@core/log"
import { accountsCatalogState, accountsState, balanceTotalsState, settingQuery } from "@ui/atoms"
import { selector, useRecoilValue } from "recoil"

let stop: null | (() => void) = null

const portfolioAccountsState = selector({
  key: "portfolioAccountsState",
  get: ({ get }) => {
    // TODO remove
    // eslint-disable-next-line no-console
    console.log("portfolioAccountsState.get")
    if (!stop) stop = log.timer("portfolioAccountsState")
    const accounts = get(accountsState)
    const catalog = get(accountsCatalogState)
    const currency = get(settingQuery("selectedCurrency"))
    const balanceTotals = get(balanceTotalsState).filter((b) => b.currency === currency)
    stop()
    return { accounts, catalog, balanceTotals, currency }
  },
})

export const usePortfolioAccounts = () => {
  return useRecoilValue(portfolioAccountsState)
}
