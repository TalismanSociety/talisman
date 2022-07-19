import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import sortBy from "lodash/sortBy"
import { useMemo } from "react"

import { usePortfolio } from "../context"

const getNetworkInfo = ({ chain, evmNetwork }: { chain?: Chain; evmNetwork?: EvmNetwork }) => {
  if (evmNetwork)
    return { label: evmNetwork.name, type: evmNetwork.isTestnet ? "Testnet" : "EVM blockchain" }

  if (chain) {
    if (chain.isTestnet) return { label: chain.name, type: "Testnet" }
    return { label: chain.name, type: chain.paraId ? "Parachain" : "Relay chain" }
  }

  return { label: "", type: "" }
}

const getNetworkLogoId = (
  id: string | number,
  chains: Chain[] | undefined,
  evmNetworks: EvmNetwork[] | undefined
) => {
  const chain = chains?.find((c) => c.id === id)
  if (chain) return chain.id
  const evmNetwork = evmNetworks?.find((n) => n.id === id)
  if (evmNetwork) return evmNetwork.substrateChain?.id ?? evmNetwork.id
  return undefined
}

const getPortfolioNetwork = (
  id: string | number,
  chains: Chain[] | undefined,
  evmNetworks: EvmNetwork[] | undefined
) => {
  const chain = chains?.find((c) => c.id === id)
  const evmNetwork = evmNetworks?.find((n) => n.id === id)

  return {
    id,
    ...getNetworkInfo({ chain, evmNetwork }),
    logoId: getNetworkLogoId(id, chains, evmNetworks),
  }
}

export type PortfolioNetwork = {
  id: string | number
  logoId?: string | number | undefined
  label: string | null
  type: string
}

export const usePortfolioNetworks = (ids: (string | number)[] | undefined): PortfolioNetwork[] => {
  const { chains, evmNetworks } = usePortfolio()

  const networks = useMemo(
    () =>
      sortBy(ids?.map((id) => getPortfolioNetwork(id, chains, evmNetworks)) ?? [], [
        "label",
        "type",
      ]),
    [chains, evmNetworks, ids]
  )

  return networks
}
