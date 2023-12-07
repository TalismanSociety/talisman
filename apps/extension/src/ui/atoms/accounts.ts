import { Trees } from "@core/domains/accounts/helpers.catalog"
import { AccountJsonAny, AccountType } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { api } from "@ui/api"
import { atom, selectorFamily } from "recoil"

/**
 * Accounts
 */
const rawAccountsState = atom<AccountJsonAny[]>({
  key: "rawAccountsState",
  effects: [
    ({ setSelf }) => {
      console.log("rawAccountsState start")
      const stop = log.timer("rawAccountsState")
      let done = false
      const unsubscribe = api.accountsSubscribe((v) => {
        if (!done) {
          done = true
          stop()
        } else {
          console.warn("update rawAccountState ")
        }

        setSelf(v)
      })
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
      console.log("accountsCatalogState start")
      const stop = log.timer("accountsCatalogState")
      let done = false
      const unsubscribe = api.accountsCatalogSubscribe((v) => {
        if (!done) {
          done = true
          stop()
        } else {
          console.warn("update accountsCatalogState ")
        }
        setSelf(v)
      })
      return () => unsubscribe()
    },
  ],
})
