import type {
  AccountProxiesSubscriptionResponse,
  AccountProxySet,
} from "@core/domains/accountProxies/types"
import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { useMemo } from "react"
import { map, Observable, ReplaySubject, shareReplay } from "rxjs"

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

/**
 * Total number of proxies (not deposit) across all networks for `address`.
 * Returns 0 when the address is unknown or has no proxies.
 */
export const useAccountProxiesCount = (address: string | null | undefined): number => {
  const sets = useAccountProxySets()
  return useMemo(() => {
    if (!address) return 0
    return sets.reduce(
      (total, s) => (s.delegator === address ? total + s.proxies.length : total),
      0
    )
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
 * True when the connected wallet account at `address` can sign add/remove proxy
 * extrinsics locally (i.e. it's a `keypair` account managed by the keystore).
 *
 * Ledger / Vault / Signet are read-only in v1 because the password-gated sign
 * path can't drive their hardware/QR/multisig flows yet.
 */
export const useAccountCanWriteProxies = (address: string | null | undefined): boolean => {
  const account = useAccountByAddress(address ?? null)
  return account?.type === "keypair"
}
