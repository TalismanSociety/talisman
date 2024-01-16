import { AccountJsonAny, AccountType } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { api } from "@ui/api"
import { atom, selectorFamily } from "recoil"

const accountsState = atom<AccountJsonAny[]>({
  key: "accountsState",
  effects: [
    ({ setSelf }) => {
      log.debug("accountsState.init")
      const unsub = api.accountsSubscribe(setSelf)
      return () => unsub()
    },
  ],
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
