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
import { useSetting } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

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

const useAllNetworks = ({ balances, type }: { type?: AccountAddressType; balances?: Balances }) => {
  const { t } = useTranslation("portfolio")
  const [useTestnets] = useSetting("useTestnets")
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
        (a, b) =>
          (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER)
      )
  }, [balances, chains, evmNetworks, tokens, type, t])

  useEffect(() => {
    if (networks.map(({ id }) => id).join(",") !== safeNetworks.map(({ id }) => id).join(",")) {
      setSafeNetworks(networks)
    }
  }, [networks, safeNetworks])

  return safeNetworks
}

// allows sharing the network filter between pages
const usePortfolioProvider = () => {
  const [useTestnets] = useSetting("useTestnets")
  const { account } = useSelectedAccount()
  const { chains } = useChains(useTestnets)
  const { tokens } = useTokens(useTestnets)
  const { evmNetworks } = useEvmNetworks(useTestnets)
  const hydrate = useBalancesHydrate()
  const balances = useBalances()
  const myBalances = useBalances("portfolio")

  const allBalances = useMemo(
    () => (account ? balances.find({ address: account.address }) : myBalances),
    [account, balances, myBalances]
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
