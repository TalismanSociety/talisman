import { AccountAddressType } from "@core/domains/accounts/types"
import { Balances } from "@core/domains/balances/types"
import { Token } from "@core/domains/tokens/types"
import { provideContext } from "@talisman/util/provideContext"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import useBalances from "@ui/hooks/useBalances"
import { useBalancesHydrate } from "@ui/hooks/useBalancesHydrate"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSettings } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { useEffect, useMemo, useState } from "react"

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
    if (chainId) return "chain" in token && token.chain?.id === chainId
    if (evmNetworkId) return "evmNetwork" in token && token.evmNetwork?.id === evmNetworkId
    return true
  })
  return networkTokens.map(({ symbol }) => symbol).filter(Boolean)
}

const useAllNetworks = ({ balances, type }: { type?: AccountAddressType; balances?: Balances }) => {
  const { useTestnets = false } = useSettings()
  const { chains } = useChains(useTestnets)
  const { tokens } = useTokens(useTestnets)
  const { evmNetworks } = useEvmNetworks(useTestnets)
  const [safeNetworks, setSafeNetworks] = useState<NetworkOption[]>([])

  const networks = useMemo(() => {
    const result: NetworkOption[] = []

    if (chains && (!type || type === "sr25519"))
      chains.forEach(({ id, name, sortIndex }) =>
        result.push({
          id,
          chainId: id,
          name: name ?? "Unknown chain",
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
const usePortfolioProvider = () => {
  const { useTestnets = false } = useSettings()
  const { account } = useSelectedAccount()
  const { chains } = useChains(useTestnets)
  const { tokens } = useTokens(useTestnets)
  const { evmNetworks } = useEvmNetworks(useTestnets)
  const hydrate = useBalancesHydrate()
  const balances = useBalances()

  const allBalances = useMemo(
    () => (account ? balances.find({ address: account.address }) : balances),
    [account, balances]
  )

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

export const [PortfolioProvider, usePortfolio] = provideContext(usePortfolioProvider)
