import { AccountJsonAny, AccountType } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { Address } from "@talismn/balances"
import { encodeAnyAddress } from "@talismn/util"
import { api } from "@ui/api"
import { atom, selector, selectorFamily } from "recoil"

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

const accountsMapState = selector({
  key: "accountsMapState",
  get: ({ get }) => {
    const accounts = get(accountsState)
    return Object.fromEntries(accounts.map((account) => [account.address, account])) as Record<
      Address,
      AccountJsonAny
    >
  },
})

export const accountByAddressQuery = selectorFamily({
  key: "accountByAddressQuery",
  get:
    (address: Address | null | undefined) =>
    // eslint-disable-next-line react/display-name
    ({ get }) => {
      const accountsMap = get(accountsMapState)
      if (!address) return null
      if (accountsMap[address]) return accountsMap[address] as AccountJsonAny
      try {
        // address may be encoded with a specific prefix
        const encoded = encodeAnyAddress(address, 42)
        if (accountsMap[encoded]) return accountsMap[encoded] as AccountJsonAny
      } catch (err) {
        // invalid address
      }
      return null
    },
})

export type AccountsFilter = "all" | "watched" | "owned" | "portfolio" | "signet"

const IS_EXTERNAL: Partial<Record<AccountType, true>> = {
  [AccountType.Watched]: true,
  [AccountType.Signet]: true,
}

export const accountsQuery = selectorFamily({
  key: "accountsQuery",
  get:
    (filter: AccountsFilter = "all") =>
    ({ get }) => {
      const accounts = get(accountsState)
      switch (filter) {
        case "portfolio":
          return accounts.filter(
            ({ origin, isPortfolio }) => !origin || !IS_EXTERNAL[origin] || isPortfolio
          )
        case "watched":
          return accounts.filter(({ origin }) => origin === AccountType.Watched)
        case "owned":
          return accounts.filter(({ origin }) => !origin || !IS_EXTERNAL[origin])
        case "signet":
          return accounts.filter(({ origin }) => origin === AccountType.Signet)
        case "all":
          return accounts
      }
    },
})
