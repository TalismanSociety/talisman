import { bind } from "@react-rxjs/core"
import { HydrateDb } from "@talismn/balances"
import { Chain, ChainId, EvmNetwork, EvmNetworkId, Token } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/util"
import { t } from "i18next"
import { BehaviorSubject, combineLatest, map, shareReplay, switchMap } from "rxjs"

import { AccountAddressType, AccountJsonAny, Balances } from "@extension/core"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"

import { balancesHydrate$, getBalances$, isBalanceInitialising$ } from "./balances"
import { getChains$, getEvmNetworks$, getTokens$ } from "./chaindata"
import { getSettingValue$ } from "./settings"

export type NetworkOption = {
  id: string // here we'll merge all ids together
  name: string
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  symbols?: string[] // use when searching network by token symbol
  sortIndex: number | null
}

type PortfolioGlobalData = {
  chains: Chain[]
  tokens: Token[]
  evmNetworks: EvmNetwork[]
  hydrate: HydrateDb
  allBalances: Balances
  portfolioBalances: Balances
  isProvisioned: boolean
  isInitialising: boolean
}

const getNetworkTokenSymbols = ({
  tokens,
  chainId,
  evmNetworkId,
}: {
  tokens?: Token[]
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
}) => {
  if (!tokens) return []
  const networkTokens = tokens.filter((token) => {
    if (isSubToken(token)) return token.chain?.id === chainId
    if (isEvmToken(token)) return token.evmNetwork?.id === evmNetworkId
    return true
  })
  return networkTokens.map(({ symbol }) => symbol).filter(Boolean)
}

const getAccountsType = (accounts?: AccountJsonAny[]) => {
  if (accounts?.every((a) => a.type === "ethereum")) return "ethereum"
  if (accounts?.every((a) => a.type !== "ethereum")) return "sr25519" // TODO rename substrate or ss58
  return undefined
}

const getNetworkOptions = ({
  tokens,
  chains,
  evmNetworks,
  balances,
  type,
}: {
  tokens: Token[]
  chains: Chain[]
  evmNetworks: EvmNetwork[]
  type?: AccountAddressType
  balances?: Balances
}) => {
  // register all chains to account for hybrid chains, delete non-ethereum ones later if necessary
  // this ensures hybrid chain ids are consistent (substrate id should be the id, even if account only supports ethereum networks)
  let result: NetworkOption[] = chains.map(({ id, name, sortIndex }) => ({
    id,
    chainId: id,
    name: name ?? t("Unknown chain"),
    sortIndex,
  }))

  if (evmNetworks && (!type || type === "ethereum"))
    evmNetworks.forEach(({ id, name, substrateChain, sortIndex }) => {
      const existing = result.find(({ id }) => id === substrateChain?.id)
      if (existing) existing.evmNetworkId = id
      else
        result.push({
          id: String(id),
          name: name ?? t("Unknown chain"),
          evmNetworkId: id,
          chainId: substrateChain?.id,
          sortIndex,
        })
    })

  // if ethereum account is selected, remove all chains that don't have an evm network
  if (type === "ethereum") result = result.filter(({ evmNetworkId }) => !!evmNetworkId)

  // fill symbols
  result.forEach((network) => {
    const { chainId, evmNetworkId } = network
    network.symbols = getNetworkTokenSymbols({ tokens, chainId, evmNetworkId })
  })

  // construct a lookup table of chains and networks for which we have a balance
  // we do this step first so that we can avoid looping through the entire list of balances
  // once per NetworkOption.
  // instead, we go through the list -once- and then do fast lookups when we filter the list of
  // NetworkOptions.
  const chainIdsWithBalances = new Set()
  const evmNetworkIdsWithBalances = new Set()
  balances?.each.forEach((b) => {
    b.chainId && chainIdsWithBalances.add(b.chainId)
    b.evmNetworkId && evmNetworkIdsWithBalances.add(b.evmNetworkId)
  })

  return result
    .filter(
      ({ chainId, evmNetworkId }) =>
        (!!chainId && chainIdsWithBalances.has(chainId)) ||
        (!!evmNetworkId && evmNetworkIdsWithBalances.has(evmNetworkId)),
    )
    .sort(
      (a, b) => (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER),
    )
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
  const { chainId, evmNetworkId } = networkFilter ?? {}
  const lowerSearch = search?.toLowerCase()
  const filtered = allBalances.sorted
    .filter(
      (b) =>
        !networkFilter ||
        (chainId && b.chainId === chainId) ||
        (evmNetworkId && b.evmNetworkId === evmNetworkId),
    )
    .filter((b) => {
      if (!lowerSearch) return true
      return (
        b.token?.symbol.toLowerCase().includes(lowerSearch) ||
        b.chain?.name?.toLowerCase().includes(lowerSearch) ||
        b.evmNetwork?.name?.toLowerCase().includes(lowerSearch)
      )
    })
  return new Balances(filtered, hydrate)
}

// TODO review this, we may want to use usePortfolioNavigation instead
export const portfolioSelectedAccounts$ = new BehaviorSubject<AccountJsonAny[] | undefined>(
  undefined,
)

export const [usePortfolioSelectedAccounts] = bind(portfolioSelectedAccounts$)

export const portfolioNetworkFilter$ = new BehaviorSubject<NetworkOption | undefined>(undefined)

const setNetworkFilter = (network: NetworkOption | undefined) =>
  portfolioNetworkFilter$.next(network)

export const portfolioSearch$ = new BehaviorSubject<string>("")

const setSearch = (search: string) => portfolioSearch$.next(search)

export const [usePortfolioGlobalData, portfolioGlobalData$] = bind(
  getSettingValue$("useTestnets").pipe(
    switchMap((includeTestnets) =>
      combineLatest([
        getChains$({ activeOnly: true, includeTestnets }),
        getEvmNetworks$({ activeOnly: true, includeTestnets }),
        getTokens$({ activeOnly: true, includeTestnets }),
        balancesHydrate$,
        getBalances$("all"),
        getBalances$("portfolio"),
        isBalanceInitialising$,
      ]).pipe(
        map(
          ([
            chains,
            evmNetworks,
            tokens,
            hydrate,
            allBalances,
            portfolioBalances,
            isInitialising,
          ]) =>
            ({
              chains,
              evmNetworks,
              tokens,
              hydrate,
              allBalances,
              portfolioBalances,
              isInitialising,
              isProvisioned: true,
            }) as PortfolioGlobalData,
        ),
      ),
    ),
  ),
  {
    chains: [],
    tokens: [],
    evmNetworks: [],
    hydrate: {},
    allBalances: new Balances([]),
    portfolioBalances: new Balances([]),
    isProvisioned: false,
    isInitialising: false,
  } as PortfolioGlobalData,
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
        chains,
        evmNetworks,
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
      const accountType = getAccountsType(selectedAccounts)
      const networks = getNetworkOptions({
        tokens,
        chains,
        evmNetworks,
        balances: allBalances,
        type: accountType,
      })

      return {
        allBalances,
        chains,
        tokens,
        evmNetworks,
        hydrate,
        networkFilter,

        networkBalances,
        accountType,
        networks,
        isInitialising,
        isProvisioned,
      }
    },
  ),
  shareReplay(1),
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
)
