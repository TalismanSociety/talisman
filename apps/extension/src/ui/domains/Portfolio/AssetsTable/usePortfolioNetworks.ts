import { Chain, ChainId } from "@core/domains/chains/types"
import { EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { getNetworkInfo } from "@core/util/getNetworkInfo"
import sortBy from "lodash/sortBy"
import { useMemo } from "react"

import { usePortfolio } from "../context"

const getNetworkLogoId = (
  id: ChainId | EvmNetworkId,
  chains: Chain[] | undefined,
  evmNetworks: EvmNetwork[] | undefined
) => {
  const chain = chains?.find((c) => c.id === id)
  if (chain) return chain.id
  const evmNetwork = evmNetworks?.find((n) => n.id === id)
  if (evmNetwork) return evmNetwork.substrateChain?.id ?? evmNetwork.id
  return undefined
}

export type PortfolioNetwork = {
  id: ChainId | EvmNetworkId
  logoId?: ChainId | EvmNetworkId
  label: string | null
  type: string
}

const getPortfolioNetwork = (
  id: ChainId | EvmNetworkId,
  chains?: Chain[],
  evmNetworks?: EvmNetwork[]
) => {
  const chain = chains?.find((c) => c.id === id)
  const evmNetwork = evmNetworks?.find((n) => n.id === id)

  const network: PortfolioNetwork = {
    id,
    ...getNetworkInfo({ chain, evmNetwork }),
    logoId: getNetworkLogoId(id, chains, evmNetworks),
  }
  return network
}

export const usePortfolioNetworks = (ids: (ChainId | EvmNetworkId)[] | undefined) => {
  const { chains, evmNetworks } = usePortfolio()

  const networks = useMemo(
    () => ids?.map((id) => getPortfolioNetwork(id, chains, evmNetworks)) ?? [],
    [chains, evmNetworks, ids]
  )

  const sorted = useMemo(() => sortBy(networks, ["label", "type"]), [networks])

  return { networks, sorted }
}
