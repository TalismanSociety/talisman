import { Address } from "@talismn/balances"
import { encodeAnyAddress } from "@talismn/util"
import { atom } from "jotai"
import { atomFamily, atomWithObservable } from "jotai/utils"

import { AccountJsonAny, AccountType } from "@extension/core"
import { accounts$, accountsMap$ } from "@ui/state"

export type AccountCategory = "all" | "watched" | "owned" | "portfolio" | "signet"

const IS_EXTERNAL: Partial<Record<AccountType, true>> = {
  [AccountType.Dcent]: true,
  [AccountType.Watched]: true,
  [AccountType.Signet]: true,
}

const accountsAtom = atomWithObservable(() => accounts$)

// const accountsAtom = atomWithSubscription<AccountJsonAny[]>(api.accountsSubscribe, {
//   debugLabel: "accountsAtom",
// })

// export const accountsMapAtom = atom(async (get) => {
//   const accounts = await get(accountsAtom)
//   return Object.fromEntries(accounts.map((account) => [account.address, account])) as Record<
//     Address,
//     AccountJsonAny
//   >
// })

export const accountsMapAtom = atomWithObservable(() => accountsMap$)

export const accountsByAddressAtomFamily = atomFamily((address: Address | null | undefined) =>
  atom(async (get) => {
    if (!address) return null
    const accountsMap = await get(accountsMapAtom)
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

// export const accountsByAddressAtomFamily = atomWithObservable((get))

export const accountsByCategoryAtomFamily = atomFamily((category: AccountCategory = "all") =>
  atom(async (get) => {
    const accounts = await get(accountsAtom)
    switch (category) {
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
