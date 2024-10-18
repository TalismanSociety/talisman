import { bind } from "@react-rxjs/core"
import { normalizeAddress } from "@talismn/util"
import { AccountJsonAny, AccountType, Trees } from "extension-core"
import { map, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

export const accounts$ = new Observable<AccountJsonAny[]>((subscriber) => {
  const unsubscribe = api.accountsSubscribe((accounts) => {
    subscriber.next(accounts)
  })
  return () => unsubscribe()
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

export const accountsCatalog$ = new Observable<Trees>((subscriber) => {
  const unsubscribe = api.accountsCatalogSubscribe((trees) => {
    subscriber.next(trees)
  })
  return () => unsubscribe()
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

export const [useAccountsCatalog] = bind(accountsCatalog$)

// export const [useAccounts] = bind(accounts$)

export const accountsMap$ = accounts$.pipe(
  map((accounts) =>
    Object.fromEntries(accounts.map((account) => [normalizeAddress(account.address), account]))
  )
)

export const [useAccountsMap] = bind(accountsMap$)

export const [useAccountByAddress, getAccountByAddress$] = bind((address: string) =>
  accountsMap$.pipe(
    map((accountsMap) => {
      const normalizedAddress = normalizeAddress(address)
      return accountsMap[normalizedAddress] ?? null
    })
  )
)

export type AccountCategory = "all" | "watched" | "owned" | "portfolio" | "signet"

const IS_EXTERNAL: Partial<Record<AccountType, true>> = {
  [AccountType.Dcent]: true,
  [AccountType.Watched]: true,
  [AccountType.Signet]: true,
}

export const [useAccounts, getAccountsByCategory$] = bind((category: AccountCategory = "all") =>
  accounts$.pipe(
    map((accounts) => {
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
)
