import { Chain, ChainId } from "@core/domains/chains/types"
import { EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { getNetworkInfo } from "@core/util/getNetworkInfo"
import sortBy from "lodash/sortBy"
import { useMemo } from "react"

import { usePortfolio } from "../context"

export type PortfolioNetwork = {
  id: ChainId | EvmNetworkId
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
  const relay = chains?.find((c) => c.id === chain?.relay?.id)

  const network: PortfolioNetwork = {
    id,
    ...getNetworkInfo({ chain, evmNetwork, relay }),
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
