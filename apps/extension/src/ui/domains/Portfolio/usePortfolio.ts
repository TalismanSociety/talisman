import { AccountAddressType, AccountJsonAny } from "@core/domains/accounts/types"
import { Balances } from "@core/domains/balances/types"
import { Token } from "@core/domains/tokens/types"
import { log } from "@core/log"
import { HydrateDb } from "@talismn/balances"
import { Chain, ChainId, EvmNetwork, EvmNetworkId } from "@talismn/chaindata-provider"
import {
  balancesFilterQuery,
  balancesHydrateState,
  chainsArrayQuery,
  evmNetworksArrayQuery,
  settingQuery,
  tokensArrayQuery,
} from "@ui/atoms"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { t } from "i18next"
import { useEffect } from "react"
import { atom, selector, useRecoilState, useRecoilValue } from "recoil"

import { selectedAccountState } from "./useSelectedAccount"

export type NetworkOption = {
  id: string // here we'll merge all ids together
  name: string
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  symbols?: string[] // use when searching network by token symbol
  sortIndex: number | null
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

const getAccountType = (account?: AccountJsonAny) => {
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
  const result: NetworkOption[] = []

  if (chains && (!type || type === "sr25519"))
    chains.forEach(({ id, name, sortIndex }) =>
      result.push({
        id,
        chainId: id,
        name: name ?? t("Unknown chain"),
        sortIndex,
      })
    )

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
  balances?.filterNonZero("total").each.forEach((b) => {
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

const getNetworkBalances = ({
  networkFilter,
  allBalances,
  hydrate,
}: {
  networkFilter?: NetworkOption
  allBalances: Balances
  hydrate: HydrateDb
}) => {
  if (!networkFilter) return allBalances
  const { chainId, evmNetworkId } = networkFilter
  const filtered = allBalances.sorted.filter(
    (b) => (chainId && b.chainId === chainId) || (evmNetworkId && b.evmNetworkId === evmNetworkId)
  )
  return new Balances(filtered, hydrate)
}

const portfolioNetworkFilterState = atom<NetworkOption | undefined>({
  key: "portfolioNetworkFilterState",
  default: undefined,
})

const portfolioGlobalState = selector({
  key: "portfolioGlobalState",
  get: ({ get }) => {
    const stop = log.timer("portfolioGlobalState")
    const includeTestnets = get(settingQuery("useTestnets"))
    const { account } = get(selectedAccountState)
    const chains = get(chainsArrayQuery({ activeOnly: true, includeTestnets }))
    const tokens = get(tokensArrayQuery({ activeOnly: true, includeTestnets }))
    const evmNetworks = get(evmNetworksArrayQuery({ activeOnly: true, includeTestnets }))
    const hydrate = get(balancesHydrateState)
    const balances = get(balancesFilterQuery("all"))
    const myBalances = get(balancesFilterQuery("portfolio"))

    const allBalances = account ? balances.find({ address: account.address }) : myBalances
    const accountType = getAccountType(account)
    const networks = getNetworkOptions({
      tokens,
      chains,
      evmNetworks,
      balances: allBalances,
      type: accountType,
    })
    const networkFilter = get(portfolioNetworkFilterState)
    const networkBalances = getNetworkBalances({ networkFilter, allBalances, hydrate })

    stop()

    return {
      networks,
      networkBalances,
      chains,
      tokens,
      evmNetworks,
      hydrate,
      allBalances,
      accountType,
    }
  },
})

// allows sharing the network filter between pages
export const usePortfolio = () => {
  const [networkFilter, setNetworkFilter] = useRecoilState(portfolioNetworkFilterState)
  const {
    accountType,
    allBalances,
    chains,
    evmNetworks,
    hydrate,
    networkBalances,
    networks,
    tokens,
  } = useRecoilValue(portfolioGlobalState)

  useEffect(() => {
    if (networkFilter && !networks.some((n) => n.id === networkFilter.id))
      setNetworkFilter(undefined)
  }, [networkFilter, networks, setNetworkFilter])

  return {
    networks,
    networkFilter,
    setNetworkFilter,
    networkBalances,
    chains,
    tokens,
    evmNetworks,
    hydrate,
    allBalances,
    accountType,
  }
}
