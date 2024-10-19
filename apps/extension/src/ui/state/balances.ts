import { bind } from "@react-rxjs/core"
import { Address, Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import isEqual from "lodash/isEqual"
import { useMemo } from "react"
import { combineLatest, distinctUntilChanged, map, Observable, shareReplay } from "rxjs"

import { BalanceSubscriptionResponse, isAccountCompatibleWithChain } from "@extension/core"
import { api } from "@ui/api"

import { AccountCategory, accountsMap$, getAccountsByCategory$ } from "./accounts"
import { getChainsMap$, getEvmNetworksMap$, getTokensMap$ } from "./registry"
import { tokenRatesMap$ } from "./tokenRates"

// import {
//   AccountCategory,
//   accountsMap$,
//   getAccountsByCategory$,
//   getChainsMap$,
//   getEvmNetworksMap$,
//   getTokensMap$,
//   tokenRatesMap$,
// } from "./state"

// Reading this atom triggers the balances backend subscription
// Note : unsubscribing has no effect, the backend subscription will keep polling until the port (window or tab) is closed
const rawBalances$ = new Observable<BalanceSubscriptionResponse>((subscriber) => {
  const unsubscribe = api.balances((balances) => {
    subscriber.next(balances)
  })
  return () => unsubscribe()
}).pipe(
  distinctUntilChanged<BalanceSubscriptionResponse>(isEqual),
  shareReplay(1) // unsubscribing has no effect on backend, no need to unsubscribe
)

export const [useIsBalanceInitializing, isBalanceInitialising$] = bind(
  rawBalances$.pipe(
    map((balances) => balances.status === "initialising"),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  )
)

const rawBalancesData$ = rawBalances$.pipe(
  map((balances) => balances.data),
  distinctUntilChanged(),
  shareReplay(1)
)

const filteredRawBalances$ = combineLatest([
  getTokensMap$({ includeTestnets: true, activeOnly: true }),
  getChainsMap$({ includeTestnets: true, activeOnly: true }),
  accountsMap$,
  rawBalancesData$,
]).pipe(
  map(([tokens, chains, accounts, balances]) =>
    balances.filter((b) => {
      // ensure there is a matching token
      if (!tokens[b.tokenId]) return false

      const account = accounts[b.address]
      if (!account || !account.type) return false

      // for chain specific accounts, exclude balances from other chains
      if ("chainId" in b && b.chainId && chains[b.chainId])
        return isAccountCompatibleWithChain(chains[b.chainId], account.type, account.genesisHash)
      if ("evmNetworkId" in b && b.evmNetworkId) return account.type === "ethereum"
      return false
    })
  ),
  shareReplay(1)
)

export const [useBalancesHydrate, balancesHydrate$] = bind(
  combineLatest([
    getChainsMap$({ includeTestnets: true, activeOnly: true }),
    getEvmNetworksMap$({ includeTestnets: true, activeOnly: true }),
    getTokensMap$({ includeTestnets: true, activeOnly: true }),
    tokenRatesMap$,
  ]).pipe(
    map(([chains, evmNetworks, tokens, tokenRates]) => ({
      chains,
      evmNetworks,
      tokens,
      tokenRates,
    }))
  )
)

const [_useAllBalances, allBalances$] = bind(
  combineLatest([filteredRawBalances$, balancesHydrate$]).pipe(
    map(([rawBalances, hydrate]) => new Balances(rawBalances, hydrate))
  )
)

type BalanceQueryParams = {
  address?: Address | null
  tokenId?: TokenId | null
}

const [_useBalancesByQuery, getBalancesByQuery$] = bind(
  ({ address, tokenId }: BalanceQueryParams) =>
    combineLatest([allBalances$, balancesHydrate$]).pipe(
      map(([allBalances, hydrate]) => {
        const filteredBalances = allBalances.each.filter(
          (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId)
        )
        return new Balances(filteredBalances, hydrate)
      })
    )
)

export const [useBalance, getBalance$] = bind(
  (address: Address | null | undefined, tokenId: TokenId | null | undefined) =>
    getBalancesByQuery$({ address, tokenId }).pipe(map((balances) => balances.each[0] ?? null))
)

const [_useBalancesByCategory, getBalancesByCategory$] = bind((category: AccountCategory = "all") =>
  combineLatest([allBalances$, getAccountsByCategory$(category)]).pipe(
    map(([allBalances, accounts]) => {
      const accountIds = accounts.map((a) => a.address)
      return new Balances(allBalances.each.filter((b) => accountIds.includes(b.address)))
    })
  )
)

type BalancesFilter = AccountCategory | BalanceQueryParams

export const [useBalances, getBalances$] = bind((arg: BalancesFilter = "all") =>
  typeof arg === "object" ? getBalancesByQuery$(arg) : getBalancesByCategory$(arg)
)

export const useBalancesByAddress = (address: Address | null | undefined) => {
  const arg = useMemo(() => ({ address }), [address])
  return useBalances(arg)
}
