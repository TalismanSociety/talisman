import { AccountAddressType, AccountJsonAny, Balances, Token } from "@extension/core"
import { log } from "@extension/shared"
import { HydrateDb } from "@talismn/balances"
import { Chain, ChainId, EvmNetwork, EvmNetworkId } from "@talismn/chaindata-provider"
import {
  balancesByAccountCategoryAtomFamily,
  balancesHydrateAtom,
  balancesInitialisingAtom,
  chainsArrayAtomFamily,
  evmNetworksArrayAtomFamily,
  settingsAtomFamily,
  tokensArrayAtomFamily,
} from "@ui/atoms"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { t } from "i18next"
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"

import { useSelectedAccount } from "./useSelectedAccount"

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
  isInitialising: boolean
  isProvisioned: boolean
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

const portfolioAccountAtom = atom<AccountJsonAny | undefined>(undefined)

const networkFilterAtom = atom<NetworkOption | undefined>(undefined)

// the async atom, whose value must be copied in the sync atom
const portfolioGlobalDataAsyncAtom = atom<Promise<PortfolioGlobalData>>(async (get) => {
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
const portfolioGlobalDataAtom = atom<PortfolioGlobalData>({
  chains: [],
  tokens: [],
  evmNetworks: [],
  hydrate: {},
  allBalances: new Balances([]),
  portfolioBalances: new Balances([]),
  isInitialising: false,
  isProvisioned: false,
})

const portfolioAtom = atom((get) => {
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

  const networkBalances = getNetworkBalances({ networkFilter, allBalances, hydrate })
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

let isProvisioningHookMounted = false

// call this only in the root component, this sadly can't be done from an atom
export const usePortfolioProvisioning = () => {
  const globalData = useAtomValue(portfolioGlobalDataAsyncAtom)
  const { account } = useSelectedAccount()

  // sync atom to maintain
  const [{ isProvisioned }, setGlobalData] = useAtom(portfolioGlobalDataAtom)

  const setNetworkFilter = useSetAtom(networkFilterAtom)
  const setAccount = useSetAtom(portfolioAccountAtom)

  useEffect(() => {
    // update sync atom
    setGlobalData(globalData)
  }, [globalData, setGlobalData])

  useEffect(() => {
    // update sync atom
    setAccount(account)
  }, [account, setAccount])

  useEffect(() => {
    if (isProvisioningHookMounted) {
      log.warn("Do not mount usePortfolioProvisioning more than once per page")
    }
    isProvisioningHookMounted = true
    return () => {
      isProvisioningHookMounted = false
    }
  }, [])

  useEffect(() => {
    // clear filter after unmount
    return () => {
      setNetworkFilter(undefined)
    }
  }, [setNetworkFilter])

  return isProvisioned && isProvisioningHookMounted
}

export const usePortfolio = () => {
  const setNetworkFilter = useSetAtom(networkFilterAtom)

  const portfolio = useAtomValue(portfolioAtom)

  useEffect(() => {
    if (!isProvisioningHookMounted)
      log.error("usePortfolioProvisioning must be mounted before calling usePortfolio")
  }, [])

  return { ...portfolio, setNetworkFilter }
}
