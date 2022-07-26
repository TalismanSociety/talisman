import { AccountAddressType } from "@core/domains/accounts/types"
import { Balances } from "@core/domains/balances/types"
import { Chain, ChainList } from "@core/domains/chains/types"
import { EvmNetwork, EvmNetworkList } from "@core/domains/ethereum/types"
import { Token, TokenList } from "@core/domains/tokens/types"
import { provideContext } from "@talisman/util/provideContext"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import useTokens from "@ui/hooks/useTokens"
import { ReactNode, useEffect, useMemo, useState } from "react"

const useHydrateBalances = (chains?: Chain[], evmNetworks?: EvmNetwork[], tokens?: Token[]) => {
  const chainsDb = useMemo(
    () => Object.fromEntries((chains || []).map((chain) => [chain.id, chain])) as ChainList,
    [chains]
  )
  const evmNetworksDb = useMemo(
    () =>
      Object.fromEntries(
        (evmNetworks || []).map((evmNetwork) => [evmNetwork.id, evmNetwork])
      ) as EvmNetworkList,
    [evmNetworks]
  )
  const tokensDb = useMemo(
    () => Object.fromEntries((tokens || []).map((token) => [token.id, token])) as TokenList,
    [tokens]
  )
  return { chains: chainsDb, evmNetworks: evmNetworksDb, tokens: tokensDb }
}

const usePortfolioCommonDataProvider = () => {
  // Keeping these available from a context prevents maintaining separate subscriptions to Dexie.
  // Dexie's fast but still uses x more resources if x components call these hooks directly
  const chains = useChains()
  const evmNetworks = useEvmNetworks()
  const tokens = useTokens()

  const hydrate = useHydrateBalances(chains, evmNetworks, tokens)

  return { chains, evmNetworks, tokens, hydrate }
}

// dedicated context so it can be shared between PortfolioProviderSingleAccount and PortfolioProviderAllAccounts
const [PortfolioCommonDataProvider, usePortfolioCommonData] = provideContext(
  usePortfolioCommonDataProvider
)

export type NetworkOption = {
  id: string // here we'll merge all ids together
  name: string
  chainId?: string
  evmNetworkId?: number
  logoId: string
  symbols?: string[] // use when searching network by token symbol
  sortIndex: number | null
}

const getNetworkTokenSymbols = ({
  tokens,
  chainId,
  evmNetworkId,
}: {
  tokens?: Token[]
  chainId?: string
  evmNetworkId?: number
}) => {
  if (!tokens) return []
  const networkTokens = tokens.filter((token) => {
    if (chainId) return "chain" in token && token.chain?.id === chainId
    if (evmNetworkId) return "evmNetwork" in token && token.evmNetwork?.id === evmNetworkId
    return true
  })
  return networkTokens.map(({ symbol }) => symbol).filter(Boolean)
}

const useAllNetworks = ({ balances, type }: { type?: AccountAddressType; balances?: Balances }) => {
  const { chains, evmNetworks, tokens } = usePortfolioCommonData()
  const [safeNetworks, setSafeNetworks] = useState<NetworkOption[]>([])

  const networks = useMemo(() => {
    const result: NetworkOption[] = []

    if (chains && (!type || type === "sr25519"))
      chains.forEach(({ id, name, sortIndex }) =>
        result.push({
          id,
          chainId: id,
          name: name ?? "Unknown chain",
          logoId: id,
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
            name: name ?? "Unknown chain",
            evmNetworkId: id,
            logoId: substrateChain?.id ?? String(id),
            chainId: substrateChain?.id,
            sortIndex,
          })
      })

    // fill symbols
    result.forEach((network) => {
      const { chainId, evmNetworkId } = network
      network.symbols = getNetworkTokenSymbols({ tokens, chainId, evmNetworkId })
    })

    return result
      .filter(({ chainId, evmNetworkId }) =>
        balances?.sorted.some(
          (b) =>
            b.total.planck > BigInt(0) &&
            ((!!chainId && b.chainId === chainId) ||
              (!!evmNetworkId && b.evmNetworkId === evmNetworkId))
        )
      )
      .sort(
        (a, b) =>
          (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER)
      )
  }, [balances?.sorted, chains, evmNetworks, tokens, type])

  useEffect(() => {
    if (networks.map(({ id }) => id).join(",") !== safeNetworks.map(({ id }) => id).join(",")) {
      setSafeNetworks(networks)
    }
  }, [networks, safeNetworks])

  return safeNetworks
}

// allows sharing the network filter between pages
const usePortfolioProvider = ({ balances: allBalances }: { balances: Balances }) => {
  const { account } = useSelectedAccount()
  const { chains, tokens, evmNetworks, hydrate } = usePortfolioCommonData()

  const accountType = useMemo(() => {
    if (account?.type === "ethereum") return "ethereum"
    if (account?.type) return "sr25519" // all substrate
    return undefined
  }, [account])

  const networks = useAllNetworks({ balances: allBalances, type: accountType })
  const [networkFilter, setNetworkFilter] = useState<NetworkOption>()

  const networkBalances = useMemo(() => {
    if (!networkFilter) return allBalances
    const { chainId, evmNetworkId } = networkFilter
    const filtered = allBalances.sorted.filter(
      (b) => (chainId && b.chainId === chainId) || (evmNetworkId && b.evmNetworkId === evmNetworkId)
    )
    return new Balances(filtered, hydrate)
  }, [allBalances, hydrate, networkFilter])

  const isLoading = useMemo(() => {
    return !chains?.length || !tokens?.length || !evmNetworks?.length || !allBalances?.count
  }, [allBalances?.count, chains?.length, evmNetworks?.length, tokens?.length])

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
    isLoading,
  }
}

const [PortfolioInnerProvider, usePortfolioInner] = provideContext(usePortfolioProvider)

const PortfolioSingleAccountProvider = ({
  address,
  children,
}: {
  address: string
  children?: ReactNode
}) => {
  const balances = useBalancesByAddress(address)

  return <PortfolioInnerProvider balances={balances}>{children}</PortfolioInnerProvider>
}

const PortfolioAllAccountsProvider = ({ children }: { children?: ReactNode }) => {
  const balances = useBalances()

  return <PortfolioInnerProvider balances={balances}>{children}</PortfolioInnerProvider>
}

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const { account } = useSelectedAccount()

  return (
    <PortfolioCommonDataProvider>
      {account ? (
        <PortfolioSingleAccountProvider address={account.address}>
          {children}
        </PortfolioSingleAccountProvider>
      ) : (
        <PortfolioAllAccountsProvider>{children}</PortfolioAllAccountsProvider>
      )}
    </PortfolioCommonDataProvider>
  )
}

export const usePortfolio = usePortfolioInner
