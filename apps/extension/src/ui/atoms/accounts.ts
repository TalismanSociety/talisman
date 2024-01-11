import { Trees } from "@core/domains/accounts/helpers.catalog"
import { AccountJsonAny, AccountType } from "@core/domains/accounts/types"
import { balanceTotalsStore } from "@core/domains/balances/store.BalanceTotals"
import { BalanceTotal } from "@core/domains/balances/types"
import { log } from "@core/log"
import { api } from "@ui/api"
import { atom, selector, selectorFamily } from "recoil"
import { Subject, combineLatest } from "rxjs"

const baseAccountsState = atom<{
  accounts: AccountJsonAny[]
  catalog: Trees
  balanceTotals: BalanceTotal[]
}>({
  key: "baseAccountsState",
  effects: [
    ({ setSelf }) => {
      const stop = log.timer("baseAccountsState")
      const obsAccounts = new Subject<AccountJsonAny[]>()
      const obsCatalog = new Subject<Trees>()

      const sub = combineLatest([obsAccounts, obsCatalog, balanceTotalsStore.observable]).subscribe(
        ([accounts, catalog, balanceTotals]) => {
          stop()
          setSelf({ accounts, catalog, balanceTotals: Object.values(balanceTotals) })
        }
      )

      const unsubAccounts = api.accountsSubscribe((v) => obsAccounts.next(v))
      const unsubCatalog = api.accountsCatalogSubscribe((v) => obsCatalog.next(v))

      return () => {
        unsubCatalog()
        unsubAccounts()
        sub.unsubscribe()
      }
    },
  ],
})

export const accountsState = selector({
  key: "accountsState",
  get: ({ get }) => {
    const { accounts } = get(baseAccountsState)
    return accounts
  },
})

export const accountsCatalogState = selector({
  key: "accountsCatalogState",
  get: ({ get }) => {
    const { catalog } = get(baseAccountsState)
    return catalog
  },
})

export const balanceTotalsState = selector({
  key: "balanceTotalsState",
  get: ({ get }) => {
    const { balanceTotals } = get(baseAccountsState)
    return balanceTotals
  },
})

export type AccountsFilter = "all" | "watched" | "owned" | "portfolio"

export const accountsQuery = selectorFamily({
  key: "accountsQuery",
  get:
    (filter: AccountsFilter = "all") =>
    ({ get }) => {
      const accounts = get(accountsState)
      switch (filter) {
        case "portfolio":
          return accounts.filter(
            ({ origin, isPortfolio }) => origin !== AccountType.Watched || isPortfolio
          )
        case "watched":
          return accounts.filter(({ origin }) => origin === AccountType.Watched)
        case "owned":
          return accounts.filter(({ origin }) => origin !== AccountType.Watched)
        case "all":
          return accounts
      }
    },
})
