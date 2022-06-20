import { ChainsDb, EvmNetworksDb, TokensDb } from "@core/domains/balances/types"
import { AccountAddressType, Balances, Chain, EvmNetwork, Token } from "@core/types"
import { provideContext } from "@talisman/util/provideContext"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import useTokens from "@ui/hooks/useTokens"
import { ReactNode, useMemo, useState } from "react"

const useHydrateBalances = (chains?: Chain[], evmNetworks?: EvmNetwork[], tokens?: Token[]) => {
  const chainsDb = useMemo(
    () => Object.fromEntries((chains || []).map((chain) => [chain.id, chain])) as ChainsDb,
    [chains]
  )
  const evmNetworksDb = useMemo(
    () =>
      Object.fromEntries(
        (evmNetworks || []).map((evmNetwork) => [evmNetwork.id, evmNetwork])
      ) as EvmNetworksDb,
    [evmNetworks]
  )
  const tokensDb = useMemo(
    () => Object.fromEntries((tokens || []).map((token) => [token.id, token])) as TokensDb,
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
}

const useAllNetworks = (type?: AccountAddressType) => {
  const { chains, evmNetworks } = usePortfolioCommonData()

  const networks = useMemo(() => {
    const result: NetworkOption[] = []

    if (chains && (!type || type === "sr25519"))
      chains.forEach(({ id, name }) =>
        result.push({ id, chainId: id, name: name ?? "Unknown chain", logoId: id })
      )

    if (evmNetworks && (!type || type === "ethereum"))
      evmNetworks.forEach(({ id, name, substrateChain }) => {
        const existing = result.find(({ id }) => id === substrateChain?.id)
        if (existing) existing.evmNetworkId = id
        else
          result.push({
            id: String(id),
            name: name ?? "Unknown chain",
            evmNetworkId: id,
            logoId: substrateChain?.id ?? String(id),
            chainId: substrateChain?.id,
          })
      })

    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [chains, evmNetworks, type])

  return networks
}

// allows sharing the network filter between the 2 pages
const usePortfolioProvider = ({ balances: allBalances }: { balances: Balances }) => {
  const { account } = useSelectedAccount()
  const { chains, tokens, evmNetworks, hydrate } = usePortfolioCommonData()

  const accountType = useMemo(() => {
    if (account?.type === "ethereum") return "ethereum"
    if (account?.type) return "sr25519" // all substrate
    return undefined
  }, [account])

  const networks = useAllNetworks(accountType)
  const [networkFilter, setNetworkFilter] = useState<NetworkOption>()

  const balances = useMemo(() => {
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
    balances,
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
