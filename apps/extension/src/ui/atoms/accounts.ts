import { Trees } from "@core/domains/accounts/helpers.catalog"
import { AccountType } from "@core/domains/accounts/types"
import { selector, selectorFamily } from "recoil"

import { mainState } from "./main"

export type AccountsFilter = "all" | "watched" | "owned" | "portfolio"

export const accountsQuery = selectorFamily({
  key: "accountsQuery",
  get:
    (filter: AccountsFilter = "all") =>
    ({ get }) => {
      const { accounts } = get(mainState)
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

/**
 * Accounts Catalog
 */
export const accountsCatalogState = selector<Trees>({
  key: "accountsCatalogState",
  get: ({ get }) => {
    const { accountsCatalog } = get(mainState)
    return accountsCatalog
  },
})
