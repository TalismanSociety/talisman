import { Trees } from "@core/domains/accounts/helpers.catalog"
import { AccountJsonAny, AccountType } from "@core/domains/accounts/types"
import { api } from "@ui/api"
import { atom, selectorFamily } from "recoil"

/**
 * Accounts
 */
const rawAccountsState = atom<AccountJsonAny[]>({
  key: "rawAccountsState",
  effects: [
    ({ setSelf }) => {
      const unsubscribe = api.accountsSubscribe(setSelf)
      return () => unsubscribe()
    },
  ],
})

export type AccountsFilter = "all" | "watched" | "owned" | "portfolio"

export const accountsQuery = selectorFamily({
  key: "accountsQuery",
  get:
    (filter: AccountsFilter = "all") =>
    ({ get }) => {
      const allAccounts = get(rawAccountsState)
      switch (filter) {
        case "portfolio":
          return allAccounts.filter(
            ({ origin, isPortfolio }) => origin !== AccountType.Watched || isPortfolio
          )
        case "watched":
          return allAccounts.filter(({ origin }) => origin === AccountType.Watched)
        case "owned":
          return allAccounts.filter(({ origin }) => origin !== AccountType.Watched)
        case "all":
          return allAccounts
      }
    },
})

/**
 * Accounts Catalog
 */
export const accountsCatalogState = atom<Trees>({
  key: "accountsCatalogState",
  effects: [
    ({ setSelf }) => {
      const unsubscribe = api.accountsCatalogSubscribe(setSelf)
      return () => unsubscribe()
    },
  ],
})
