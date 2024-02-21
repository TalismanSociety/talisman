import { AccountJsonAny, AccountType } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { Address } from "@talismn/balances"
import { encodeAnyAddress } from "@talismn/util"
import { api } from "@ui/api"
import { atom } from "jotai"
import { selectAtom } from "jotai/utils"
import { atomFamily } from "jotai/utils"
import { selector as rSelector, selectorFamily as rSelectorFamily, atom as ratom } from "recoil"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export type AccountsFilter = "all" | "watched" | "owned" | "portfolio" | "signet"

const IS_EXTERNAL: Partial<Record<AccountType, true>> = {
  [AccountType.Watched]: true,
  [AccountType.Signet]: true,
}

const accountsAtom = atomWithSubscription<AccountJsonAny[]>(api.accountsSubscribe, "accountsAtom")

const accountsMapAtom = selectAtom(
  accountsAtom,
  (accounts) =>
    Object.fromEntries(accounts.map((account) => [account.address, account])) as Record<
      Address,
      AccountJsonAny
    >
)

export const accountsByAddressAtomFamily = atomFamily((address: Address | null | undefined) =>
  atom(async (get) => {
    // necessary await, bad jotai typing
    const accountsMap = await get(accountsMapAtom)
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
  })
)

export const accountsByFilterFamily = atomFamily((filter: AccountsFilter = "all") =>
  atom(async (get) => {
    // necessary await, bad jotai typing
    const accounts = await get(accountsAtom)
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
  })
)

const accountsState = ratom<AccountJsonAny[]>({
  key: "accountsState",
  effects: [
    ({ setSelf }) => {
      log.debug("accountsState.init")
      const unsub = api.accountsSubscribe(setSelf)
      return () => unsub()
    },
  ],
})

const accountsMapState = rSelector({
  key: "accountsMapState",
  get: ({ get }) => {
    const accounts = get(accountsState)
    return Object.fromEntries(accounts.map((account) => [account.address, account])) as Record<
      Address,
      AccountJsonAny
    >
  },
})

export const accountByAddressQuery = rSelectorFamily({
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

export const accountsQuery = rSelectorFamily({
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
