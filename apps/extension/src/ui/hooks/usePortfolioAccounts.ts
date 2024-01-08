import { Trees } from "@core/domains/accounts/helpers.catalog"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { settingsStore } from "@core/domains/app/store.settings"
import { BalanceTotal } from "@core/domains/balances/types"
import { log } from "@core/log"
import { TokenRateCurrency } from "@talismn/token-rates"
import { api } from "@ui/api"
import { atom, useRecoilValue } from "recoil"
import { Subject, combineLatest } from "rxjs"

// combine all the state needed by this screen into this one atom, to prevent the need to wait for the main wallet atom
const portfolioAccountsState = atom<{
  accounts: AccountJsonAny[]
  catalog: Trees
  currency: TokenRateCurrency
  balanceTotals: BalanceTotal[]
}>({
  key: "portfolioAccountsState",
  effects: [
    ({ setSelf }) => {
      // console.log("portfolioAccountsState.get")
      const stop = log.timer("portfolioAccountsState")
      const obsAccounts = new Subject<AccountJsonAny[]>()
      const obsAccountsCatalog = new Subject<Trees>()
      //const obsBalanceTotals = liveQuery(() => db.balanceTotals.toArray())

      combineLatest([
        obsAccounts,
        obsAccountsCatalog,
        settingsStore.observable,
        //obsBalanceTotals,
      ]).subscribe(
        ([
          accounts,
          catalog,
          settings,
          // balanceTotals
        ]) => {
          //  console.log({ accounts: accounts.length })
          stop()
          setSelf({
            accounts,
            catalog,
            currency: settings.selectedCurrency,
            balanceTotals: [],
            //balanceTotals,
          })
        }
      )

      const unsubAccounts = api.accountsSubscribe((v) => obsAccounts.next(v))
      const unsubAccountsCatalog = api.accountsCatalogSubscribe((v) => obsAccountsCatalog.next(v))

      return () => {
        unsubAccounts()
        unsubAccountsCatalog()
      }
    },
  ],
})

export const usePortfolioAccounts = () => {
  return useRecoilValue(portfolioAccountsState)
}
