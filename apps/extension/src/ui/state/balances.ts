import { bind } from "@react-rxjs/core"
import { Address, Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { BalanceSubscriptionResponse } from "extension-core"
import { isAccountCompatibleWithNetwork } from "extension-core/src/domains/accounts/helpers"
import {
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  shareReplay,
  throttleTime,
} from "rxjs"

import { api } from "@ui/api"

import { AccountCategory, accountsMap$, getAccountsByCategory$ } from "./accounts"
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
  }).pipe(debugObservable("balancesHydrate$")),
)

// Reading this atom triggers the balances backend subscription
// Unsubscribing has no effect, the backend subscription will keep polling until the port (window or tab) is closed
const rawBalances$ = new Observable<BalanceSubscriptionResponse>((subscriber) => {
  const unsubscribe = api.balances((balances) => {
    subscriber.next(balances)
  })
  return () => unsubscribe()
}).pipe(
  throttleTime(200, undefined, { leading: true, trailing: true }),
  debugObservable("rawBalances$"),
  shareReplay(1),
)

export const [useIsBalanceInitializing, isBalanceInitialising$] = bind(
  rawBalances$.pipe(
    map((balances) => balances.status === "initialising"),
    distinctUntilChanged(),
  ),
)

const allBalances$ = combineLatest([
  getTokensMap$(BALANCES_CHAINDATA_QUERY),
  getNetworksMapById$(BALANCES_CHAINDATA_QUERY),
  accountsMap$,
  rawBalances$.pipe(map((balances) => balances.data)),
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
    return new Balances(validBalances, hydrate)
  }),
  shareReplay(1),
)

type BalanceQueryParams = {
  address?: Address | null
  tokenId?: TokenId | null
}

const getBalancesByQuery$ = ({ address, tokenId }: BalanceQueryParams) =>
  combineLatest([allBalances$, balancesHydrate$]).pipe(
    map(([allBalances, hydrate]) => {
      const filteredBalances = allBalances.each.filter(
        (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId),
      )
      return new Balances(filteredBalances, hydrate)
    }),
  )

const getBalancesByCategory$ = (category: AccountCategory = "all") =>
  combineLatest([allBalances$, getAccountsByCategory$(category)]).pipe(
    map(([allBalances, accounts]) => {
      const accountIds = accounts.map((a) => a.address)
      return new Balances(allBalances.each.filter((b) => accountIds.includes(b.address)))
    }),
  )

export const [useBalance, getBalance$] = bind(
  (address: Address | null | undefined, tokenId: TokenId | null | undefined) =>
    getBalancesByQuery$({ address, tokenId }).pipe(map((balances) => balances.each[0] ?? null)),
)

export const [useBalances, getBalances$] = bind((category: AccountCategory = "all") =>
  getBalancesByCategory$(category),
)

export const [useBalancesByAddress] = bind((address: Address | null | undefined) =>
  getBalancesByQuery$({ address }),
)
