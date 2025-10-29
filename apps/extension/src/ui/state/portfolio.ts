import { bind } from "@react-rxjs/core"
import { Balances, HydrateDb } from "@talismn/balances"
import { isNetworkEth, Network, Token } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { isTruthy } from "@talismn/util"
import { Account } from "extension-core"
import { BehaviorSubject, combineLatest, map, shareReplay } from "rxjs"

import { balancesHydrate$, getBalances$, isBalanceInitialising$ } from "./balances"
import { getNetworks$, getTokens$ } from "./chaindata"
import { networkDisplayNamesMapById$ } from "./networks"

export type NetworkOption = {
  id: string // here we'll merge all ids together
  networkIds: string[]
  name: string
}

type PortfolioGlobalData = {
  networks: Network[]
  tokens: Token[]
  hydrate: HydrateDb
  allBalances: Balances
  portfolioBalances: Balances
  isProvisioned: boolean
  isInitialising: boolean
}

// ⚠️ suspenses
export const [useAllNetworkOptions, allNetworkOptions$] = bind(
  combineLatest([
    getNetworks$({ activeOnly: true, includeTestnets: true }),
    networkDisplayNamesMapById$,
  ]).pipe(
    map(([networks, networkDisplayNames]) => {
      // we want only one entry for moonbeam and other networks that have substrateChainId
      const networkIdsToExclude = new Set<string>(
        networks
          .filter(isNetworkEth)
          .map((n) => n.substrateChainId)
          .filter(isTruthy),
      )

      const networkOptions: NetworkOption[] = networks
        .filter((n) => !networkIdsToExclude.has(n.id) && !!networkDisplayNames[n.id])
        .map((n) => {
          const networkIds = [n.id, n.platform === "ethereum" ? n.substrateChainId : null].filter(
            isTruthy,
          )

          return {
            id: networkIds.join(":"),
            networkIds,
            name: networkDisplayNames[n.id] ?? n.name,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

      return networkOptions
    }),
  ),
)

// id of the currently selected network option
// feels like this should be in the location state, not in an observable
const subjectPortfolioNetworkOptionId$ = new BehaviorSubject<NetworkOption["id"] | undefined>(
  undefined,
)

export const [usePortfolioNetworkOptionId, portfolioNetworkOptionId$] = bind(
  subjectPortfolioNetworkOptionId$,
)

// ⚠️ suspenses
export const [usePortfolioNetworkFilter, portfolioNetworkFilter$] = bind(
  combineLatest([allNetworkOptions$, portfolioNetworkOptionId$]).pipe(
    map(([allNetworkOptions, portfolioNetworkOptionId]) => {
      if (!portfolioNetworkOptionId) return undefined
      return allNetworkOptions.find((n) => n.id === portfolioNetworkOptionId)
    }),
  ),
)

export const setPortfolioNetworkFilter = (network: NetworkOption | undefined) =>
  subjectPortfolioNetworkOptionId$.next(network?.id)

const getFilteredBalances = ({
  networkFilter,
  allBalances,
  hydrate,
  search,
}: {
  networkFilter?: NetworkOption
  allBalances: Balances
  hydrate: HydrateDb
  search?: string
}) => {
  if (!networkFilter && !search) return allBalances
  const lowerSearch = search?.toLowerCase()
  const filtered = allBalances.each
    .filter((b) => !networkFilter || networkFilter.networkIds.includes(b.networkId))
    .filter((b) => {
      if (!lowerSearch) return true
      const tokenSearch = [b.token?.symbol, b.token?.name, b.network?.name].join().toLowerCase()
      return tokenSearch.includes(lowerSearch)
    })
  return new Balances(filtered, hydrate)
}

const subjectPortfolioSelectedAccounts$ = new BehaviorSubject<Account[] | undefined>(undefined)

export const [usePortfolioSelectedAccounts, portfolioSelectedAccounts$] = bind(
  subjectPortfolioSelectedAccounts$,
)

export const setPortfolioSelectedAccounts = (accounts: Account[] | undefined) =>
  subjectPortfolioSelectedAccounts$.next(accounts)

const subjectPortfolioSearch$ = new BehaviorSubject<string>("")

export const [usePortfolioSearch, portfolioSearch$] = bind(subjectPortfolioSearch$)

export const setPortfolioSearch = (search: string) => subjectPortfolioSearch$.next(search)

export const [usePortfolioGlobalData, portfolioGlobalData$] = bind<PortfolioGlobalData>(
  combineLatest({
    networks: getNetworks$({ activeOnly: true, includeTestnets: true }),
    tokens: getTokens$({ activeOnly: true, includeTestnets: true }),
    hydrate: balancesHydrate$,
    allBalances: getBalances$("all"),
    portfolioBalances: getBalances$("portfolio"),
    isInitialising: isBalanceInitialising$,
  }).pipe(map((data): PortfolioGlobalData => ({ ...data, isProvisioned: true }))),
  {
    networks: [],
    tokens: [],
    hydrate: {},
    allBalances: new Balances([]),
    portfolioBalances: new Balances([]),
    isInitialising: false,
    isProvisioned: false,
  },
)

const portfolioForSelectedNetwork$ = combineLatest([
  portfolioGlobalData$,
  portfolioNetworkFilter$,
  portfolioSelectedAccounts$,
]).pipe(
  map(
    ([
      { hydrate, allBalances: allAccountsBalances, portfolioBalances },
      networkFilter,
      selectedAccounts,
    ]) => {
      const allBalances = selectedAccounts
        ? allAccountsBalances.find((b) =>
            selectedAccounts.some((a) => isAddressEqual(a.address, b.address)),
          )
        : portfolioBalances

      const networkBalances = getFilteredBalances({ networkFilter, allBalances, hydrate })

      return {
        allBalances,
        networkBalances,
      }
    },
  ),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [usePortfolioBalances, portfolioBalances$] = bind(
  combineLatest([portfolioForSelectedNetwork$, portfolioSearch$, portfolioGlobalData$]).pipe(
    map(([portfolioForSelectedNetwork, search, { hydrate }]) => {
      const searchBalances = getFilteredBalances({
        allBalances: portfolioForSelectedNetwork.networkBalances,
        hydrate,
        search,
      })

      return {
        ...portfolioForSelectedNetwork,
        searchBalances,
      }
    }),
  ),
  {
    allBalances: new Balances([]),
    searchBalances: new Balances([]),
    networkBalances: new Balances([]),
  },
)
