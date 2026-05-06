import type {
  AccountProxiesSubscriptionResponse,
  AccountProxiesSubscriptionStatus,
  AccountProxySet,
} from "@core/domains/accountProxies/types"
import { isAccountOwned, isAccountPlatformPolkadot } from "@core/domains/keyring/exports"
import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { useMemo } from "react"
import { distinctUntilChanged, map, Observable, ReplaySubject, shareReplay } from "rxjs"

import { useAccountByAddress } from "./accounts"

const EMPTY_RESPONSE: AccountProxiesSubscriptionResponse = {
  status: "initialising",
  proxySets: [],
}

const rawAccountProxiesCache$ = new ReplaySubject<AccountProxiesSubscriptionResponse>(1)
rawAccountProxiesCache$.next(EMPTY_RESPONSE)

const rawAccountProxies$ = new Observable<AccountProxiesSubscriptionResponse>((subscriber) => {
  const unsubscribe = api.accountProxies((response) => {
    rawAccountProxiesCache$.next(response)
  })
  const subscription = rawAccountProxiesCache$.subscribe(subscriber)

  return () => {
    unsubscribe()
    subscription.unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

const [, accountProxies$] = bind(rawAccountProxies$, EMPTY_RESPONSE)

const accountProxySets$ = accountProxies$.pipe(map((res) => res.proxySets))

export const [useAccountProxySets] = bind(accountProxySets$, [] as AccountProxySet[])

const accountProxiesStatus$ = accountProxies$.pipe(
  map((res) => res.status),
  distinctUntilChanged()
)

export const [useAccountProxiesStatus] = bind<AccountProxiesSubscriptionStatus>(
  accountProxiesStatus$,
  "initialising"
)

/**
 * Total number of proxies (not deposit) across all networks for `address`.
 * Returns 0 when the address is unknown or has no proxies.
 */
export const useAccountProxiesCount = (address: string | null | undefined): number => {
  const sets = useAccountProxySets()
  return useMemo(() => {
    if (!address) return 0
    return sets.reduce((total, s) => (s.delegator === address ? total + s.proxyCount : total), 0)
  }, [sets, address])
}

/** All proxy sets owned by `address` (one per network with at least one row). */
export const useAccountProxySetsForAddress = (
  address: string | null | undefined
): AccountProxySet[] => {
  const sets = useAccountProxySets()
  return useMemo(
    () => (address ? sets.filter((s) => s.delegator === address) : []),
    [sets, address]
  )
}

/**
 * True when the account at `address` is owned (i.e. the user can sign
 * extrinsics with it — keypair, ledger, polkadot-vault, etc.).
 */
export const useAccountCanWriteProxies = (address: string | null | undefined): boolean => {
  const account = useAccountByAddress(address ?? null)
  return useMemo(() => isAccountPlatformPolkadot(account) && isAccountOwned(account), [account])
}
