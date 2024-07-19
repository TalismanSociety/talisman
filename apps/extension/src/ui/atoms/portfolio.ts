import { HydrateDb } from "@talismn/balances"
import { Chain, ChainId, EvmNetwork, EvmNetworkId, Token } from "@talismn/chaindata-provider"
import { t } from "i18next"
import { atom } from "jotai"

import { AccountAddressType, AccountJsonAny, Balances } from "@extension/core"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"

import {
  balancesByAccountCategoryAtomFamily,
  balancesHydrateAtom,
  balancesInitialisingAtom,
} from "./balances"
import {
  chainsArrayAtomFamily,
  evmNetworksArrayAtomFamily,
  tokensArrayAtomFamily,
} from "./chaindata"
import { settingsAtomFamily } from "./settings"
import { atomWithDebounce } from "./utils/atomWithDebounce"

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

const getAccountType = (account?: AccountJsonAny | null) => {
  if (account?.type === "ethereum") return "ethereum"
  if (account?.type) return "sr25519" // all substrate
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
        (!!evmNetworkId && evmNetworkIdsWithBalances.has(evmNetworkId))
    )
    .sort(
      (a, b) => (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER)
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
        (evmNetworkId && b.evmNetworkId === evmNetworkId)
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

export const portfolioAccountAtom = atom<AccountJsonAny | undefined>(undefined)

export const networkFilterAtom = atom<NetworkOption | undefined>(undefined)

// the async atom, whose value must be copied in the sync atom
export const portfolioGlobalDataAsyncAtom = atom<Promise<PortfolioGlobalData>>(async (get) => {
  const includeTestnets = (await get(settingsAtomFamily("useTestnets"))) as boolean
  const [chains, tokens, evmNetworks, hydrate, allBalances, portfolioBalances, isInitialising] =
    await Promise.all([
      get(chainsArrayAtomFamily({ activeOnly: true, includeTestnets })),
      get(tokensArrayAtomFamily({ activeOnly: true, includeTestnets })),
      get(evmNetworksArrayAtomFamily({ activeOnly: true, includeTestnets })),
      get(balancesHydrateAtom),
      get(balancesByAccountCategoryAtomFamily("all")),
      get(balancesByAccountCategoryAtomFamily("portfolio")),
      get(balancesInitialisingAtom),
    ])

  return {
    chains,
    tokens,
    evmNetworks,
    hydrate,
    allBalances,
    portfolioBalances,
    isInitialising,
    isProvisioned: true,
  }
})

// the sync atom from which portfolio atoms will derive
export const portfolioGlobalDataAtom = atom<PortfolioGlobalData>({
  chains: [],
  tokens: [],
  evmNetworks: [],
  hydrate: {},
  allBalances: new Balances([]),
  portfolioBalances: new Balances([]),
  isProvisioned: false,
  isInitialising: false,
})

// recomputes only if a filter (account, network) is changed
const portfolioBaseAtom = atom((get) => {
  const {
    hydrate,
    tokens,
    chains,
    evmNetworks,
    allBalances: allAccountsBalances,
    portfolioBalances,
    isInitialising,
  } = get(portfolioGlobalDataAtom)
  const networkFilter = get(networkFilterAtom)
  const account = get(portfolioAccountAtom)

  const allBalances = account
    ? allAccountsBalances.find({ address: account.address })
    : portfolioBalances

  const networkBalances = getFilteredBalances({ networkFilter, allBalances, hydrate })
  const accountType = getAccountType(account)
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
  }
})

export const { debouncedValueAtom: portfolioSearchAtom } = atomWithDebounce<string>("")

// recomputes on each search change
export const portfolioAtom = atom((get) => {
  const search = get(portfolioSearchAtom)
  const portfolio = get(portfolioBaseAtom)
  const searchBalances = getFilteredBalances({
    allBalances: portfolio.networkBalances,
    hydrate: portfolio.hydrate,
    search: (search as string) ?? "",
  })

  return {
    ...portfolio,
    searchBalances,
  }
})
