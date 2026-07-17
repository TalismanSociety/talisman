import { log } from "@common/log"
import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { BalanceSubscriptionResponse } from "@core/domains/balances/types"
import { bind } from "@react-rxjs/core"
import { type Address, Balance, Balances, getBalanceId, type IBalance } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import isEqual from "lodash-es/isEqual"
import {
  combineLatest,
  distinctUntilChanged,
  firstValueFrom,
  map,
  Observable,
  ReplaySubject,
  shareReplay,
  throttleTime,
} from "rxjs"

import { type AccountCategory, accountsMap$, getAccountsByCategory$ } from "./accounts"
import { getNetworksMapById$, getTokensMap$ } from "./chaindata"
import { tokenRatesMap$ } from "./tokenRates"
import { debugObservable } from "./util/debugObservable"

// fetch only active chains but include testnets, testnet data will be filterd out by hooks on render based on user settings
const BALANCES_CHAINDATA_QUERY = { includeTestnets: true, activeOnly: true }

export const [useBalancesHydrate, balancesHydrate$] = bind(
  combineLatest({
    networks: getNetworksMapById$(BALANCES_CHAINDATA_QUERY),
    tokens: getTokensMap$(BALANCES_CHAINDATA_QUERY),
    tokenRates: tokenRatesMap$,
  }).pipe(
    // a new hydrate object invalidates every Balance's cached formatters downstream:
    // only emit when one of the source maps actually changed reference
    distinctUntilChanged(
      (a, b) => a.networks === b.networks && a.tokens === b.tokens && a.tokenRates === b.tokenRates
    ),
    debugObservable("balancesHydrate$")
  )
)

// cache balances once fetched so they can be displayed instantly if navigating in and out of portfolio
const rawBalancesCache$ = new ReplaySubject<BalanceSubscriptionResponse>(1)

const rawBalances$ = new Observable<BalanceSubscriptionResponse>((subscriber) => {
  const unsubscribe = api.balances((balances) => {
    rawBalancesCache$.next(balances)
  })

  const subscription = rawBalancesCache$.subscribe(subscriber)

  return () => {
    unsubscribe()
    subscription.unsubscribe()
  }
}).pipe(
  throttleTime(200, undefined, { leading: true, trailing: true }),
  debugObservable("rawBalances$"),
  shareReplay({ bufferSize: 1, refCount: true })
)

export const [useIsBalanceInitializing, isBalanceInitialising$] = bind(
  rawBalances$.pipe(
    map((balances) => balances.status === "initialising"),
    distinctUntilChanged()
  ),
  true
)

/**
 * Reuses `Balance` instances across balance emissions.
 *
 * Port messages deserialize into all-new IBalance objects on every emission, but most
 * balances are unchanged from one emission to the next. Rebuilding every wrapper
 * discards each Balance's lazily-computed formatter caches and gives downstream
 * consumers (memos, === compares) a new identity for identical data — so unchanged
 * balances (matched by id + fingerprint, status included) keep their previous instance.
 */
const stabilizeBalanceInstances = () => {
  let prev = new Map<string, { storage: IBalance; balance: Balance }>()

  return (balances: IBalance[]): Balance[] => {
    const next = new Map<string, { storage: IBalance; balance: Balance }>()

    const result = balances.map((storage) => {
      const id = getBalanceId(storage)
      const prevEntry = prev.get(id)
      // allocation-free deep compare (NOT the fingerprint helpers: those JSON.stringify,
      // and since port deserialization makes every object new on every emission, the
      // strings could never be amortized here — they'd just be garbage)
      const entry =
        prevEntry && isEqual(prevEntry.storage, storage)
          ? prevEntry
          : { storage, balance: new Balance(storage) }
      next.set(id, entry)
      return entry.balance
    })

    prev = next
    return result
  }
}

const stabilize = stabilizeBalanceInstances()

const allBalances$ = combineLatest([
  getTokensMap$(BALANCES_CHAINDATA_QUERY),
  getNetworksMapById$(BALANCES_CHAINDATA_QUERY),
  accountsMap$,
  rawBalances$.pipe(map((balances) => balances.balances)),
  balancesHydrate$,
]).pipe(
  map(([tokens, networks, accounts, balances, hydrate]) => {
    const validBalances = balances.filter((b) => {
      const token = tokens[b.tokenId]
      const network = networks[b.networkId]
      const account = accounts[b.address]

      if (!token || !network || !account) return false

      return isAccountCompatibleWithNetwork(network, account)
    })
    return new Balances(stabilize(validBalances), hydrate)
  }),
  shareReplay({ bufferSize: 1, refCount: true })
)

type BalanceQueryParams = {
  address?: Address | null
  tokenId?: TokenId | null
}

const getBalancesByQuery$ = ({ address, tokenId }: BalanceQueryParams) =>
  combineLatest([allBalances$, balancesHydrate$]).pipe(
    map(([allBalances, hydrate]) => {
      const filteredBalances = allBalances.each.filter(
        (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId)
      )
      return new Balances(filteredBalances, hydrate)
    })
  )

const getBalancesByCategory$ = (category: AccountCategory = "all") =>
  combineLatest([allBalances$, getAccountsByCategory$(category)]).pipe(
    map(([allBalances, accounts]) => {
      const accountIds = accounts.map((a) => a.address)
      return new Balances(allBalances.each.filter((b) => accountIds.includes(b.address)))
    })
  )

const [useBalance, _getBalance$] = bind(
  (address: Address | null | undefined, tokenId: TokenId | null | undefined) =>
    getBalancesByQuery$({ address, tokenId }).pipe(map((balances) => balances.each[0] ?? null)),
  null
)

export const [useBalances, getBalances$] = bind(
  (category: AccountCategory = "all") => getBalancesByCategory$(category),
  new Balances([])
)

export const [useBalancesByAddress] = bind(
  (address: Address | null | undefined) => getBalancesByQuery$({ address }),
  new Balances([])
)

// used to force suspense, as useBalances() doesn't
const [_usePreloadBalances, preloadBalances$] = bind(
  new Observable<void>((subscriber) => {
    // Trigger the initial fetch of balances
    firstValueFrom(rawBalances$)
      .catch((error) => {
        log.warn("[balances] preloadBalances$ error", error)
      })
      .finally(() => {
        subscriber.next()
      })
  })
)

export { preloadBalances$, useBalance }
