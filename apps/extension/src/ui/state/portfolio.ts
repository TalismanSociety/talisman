import { bind } from "@react-rxjs/core"
import { HydrateDb } from "@talismn/balances"
import { isNetworkEth, Network, NetworkId, Token } from "@talismn/chaindata-provider"
import { isAddressEqual, isTruthy } from "@talismn/util"
import { Account, Balances } from "extension-core"
import { isAccountCompatibleWithNetwork } from "extension-core/src/domains/accounts/helpers"
import { t } from "i18next"
import { keyBy } from "lodash"
import { BehaviorSubject, combineLatest, map, shareReplay } from "rxjs"

import { balancesHydrate$, getBalances$, isBalanceInitialising$ } from "./balances"
import { getNetworks$, getTokens$ } from "./chaindata"

export type NetworkOption = {
  id: string // here we'll merge all ids together
  networkIds: string[]
  name: string
  symbols?: string[] // use when searching network by token symbol
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

const getNetworkOptions = ({
  tokens,
  networks,
  balances,
  selectedAccounts,
}: {
  tokens: Token[]
  networks: Network[]
  balances?: Balances
  selectedAccounts?: Account[]
}) => {
  const networkById = keyBy(networks, "id")
  const networkIdsWithBalances = new Set<NetworkId>(balances?.each.map((b) => b.networkId))

  const compatibleNetworkOptions = networks
    .filter((n) => networkIdsWithBalances.has(n.id) && networkById[n.id])
    .filter(
      (n) =>
        !selectedAccounts ||
        selectedAccounts.some((a) => isAccountCompatibleWithNetwork(networkById[n.id], a)),
    )

  // we want only one entry for moonbeam and other networks that have substrateChainId
  const networkIdsToExclude = new Set<string>(
    compatibleNetworkOptions.filter(isNetworkEth).map((n) => n.substrateChainId ?? ""),
  )

  const result: NetworkOption[] = compatibleNetworkOptions
    .filter((n) => !networkIdsToExclude.has(n.id))
    .map((n) => {
      const networkIds = [n.id, n.platform === "ethereum" ? n.substrateChainId : null].filter(
        isTruthy,
      )

      return {
        id: networkIds.join(":"),
        networkIds,
        name: n.name ?? t("Unknown chain"),
        symbols: tokens.filter((t) => t.networkId === n.id).map((t) => t.symbol),
      }
    })
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))

  return result.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
}

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
      return (
        b.token?.symbol.toLowerCase().includes(lowerSearch) ||
        b.network?.name?.toLowerCase().includes(lowerSearch)
      )
    })
  return new Balances(filtered, hydrate)
}

// TODO review this, we may want to use usePortfolioNavigation instead
export const portfolioSelectedAccounts$ = new BehaviorSubject<Account[] | undefined>(undefined)

export const [usePortfolioSelectedAccounts] = bind(portfolioSelectedAccounts$)

export const portfolioNetworkFilter$ = new BehaviorSubject<NetworkOption | undefined>(undefined)

const setNetworkFilter = (network: NetworkOption | undefined) =>
  portfolioNetworkFilter$.next(network)

export const portfolioSearch$ = new BehaviorSubject<string>("")

const setSearch = (search: string) => portfolioSearch$.next(search)

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
      {
        hydrate,
        tokens,
        networks,
        allBalances: allAccountsBalances,
        portfolioBalances,
        isInitialising,
        isProvisioned,
      },
      networkFilter,
      selectedAccounts,
    ]) => {
      const allBalances = selectedAccounts
        ? allAccountsBalances.find((b) =>
            selectedAccounts.some((a) => isAddressEqual(a.address, b.address)),
          )
        : portfolioBalances

      const networkBalances = getFilteredBalances({ networkFilter, allBalances, hydrate })

      const networkOptions = getNetworkOptions({
        tokens,
        networks,
        balances: allBalances,
        selectedAccounts,
      })

      return {
        allBalances,
        tokens,
        hydrate,
        networkFilter,
        networkBalances,
        networks,
        networkOptions,
        isInitialising,
        isProvisioned,
      }
    },
  ),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [usePortfolio, portfolio$] = bind(
  combineLatest([portfolioForSelectedNetwork$, portfolioSearch$]).pipe(
    map(([portfolioForSelectedNetwork, search]) => {
      const searchBalances = getFilteredBalances({
        allBalances: portfolioForSelectedNetwork.networkBalances,
        hydrate: portfolioForSelectedNetwork.hydrate,
        search,
      })

      return {
        ...portfolioForSelectedNetwork,

        search,
        searchBalances,

        setNetworkFilter,
        setSearch,
      }
    }),
  ),
  {
    allBalances: new Balances([]),
    searchBalances: new Balances([]),
    tokens: [],
    hydrate: {},
    networkFilter: undefined,
    networkBalances: new Balances([]),
    networks: [],
    networkOptions: [],
    isInitialising: false,
    isProvisioned: false,
    search: "",
    setNetworkFilter,
    setSearch,
  },
)
