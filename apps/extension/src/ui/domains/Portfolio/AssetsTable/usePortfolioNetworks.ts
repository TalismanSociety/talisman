import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { getNetworkInfo } from "@core/util/getNetworkInfo"
import sortBy from "lodash/sortBy"
import { useMemo } from "react"

import { usePortfolio } from "../context"

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

export type PortfolioNetwork = {
  id: string | number
  logoId?: string | number
  label: string | null
  type: string
}

const getPortfolioNetwork = (id: string | number, chains?: Chain[], evmNetworks?: EvmNetwork[]) => {
  const chain = chains?.find((c) => c.id === id)
  const evmNetwork = evmNetworks?.find((n) => n.id === id)
  const relay = chains?.find((c) => c.id === chain?.relay?.id)

  const network: PortfolioNetwork = {
    id,
    ...getNetworkInfo({ chain, evmNetwork, relay }),
    logoId: getNetworkLogoId(id, chains, evmNetworks),
  }
  return network
}

export const usePortfolioNetworks = (ids: (string | number)[] | undefined) => {
  const { chains, evmNetworks } = usePortfolio()

  const networks = useMemo(
    () => ids?.map((id) => getPortfolioNetwork(id, chains, evmNetworks)) ?? [],
    [chains, evmNetworks, ids]
  )

  const sorted = useMemo(() => sortBy(networks, ["label", "type"]), [networks])

  return { networks, sorted }
}
