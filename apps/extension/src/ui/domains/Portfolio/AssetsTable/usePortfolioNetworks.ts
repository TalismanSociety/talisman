import { Chain, ChainId, EvmNetwork, EvmNetworkId } from "@extension/core"
import { getNetworkInfo } from "@ui/hooks/useNetworkInfo"
import { TFunction } from "i18next"
import sortBy from "lodash/sortBy"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { usePortfolio } from "../usePortfolio"

export type PortfolioNetwork = {
  id: ChainId | EvmNetworkId
  label: string | null
  type: string
}

const getPortfolioNetwork = (
  t: TFunction,
  id: ChainId | EvmNetworkId,
  chains?: Chain[],
  evmNetworks?: EvmNetwork[]
): PortfolioNetwork => {
  const chain = chains?.find((c) => c.id === id)
  const evmNetwork = evmNetworks?.find((n) => n.id === id)
  const relay = chains?.find((c) => c.id === chain?.relay?.id)
  const { label, type } = getNetworkInfo(t, { chain, evmNetwork, relay })

  return { id, label, type }
}

export const usePortfolioNetworks = (ids: (ChainId | EvmNetworkId)[] | undefined) => {
  const { chains, evmNetworks } = usePortfolio()
  const { t } = useTranslation()

  const networks = useMemo(
    () => ids?.map((id) => getPortfolioNetwork(t, id, chains, evmNetworks)) ?? [],
    [chains, evmNetworks, ids, t]
  )

  const sorted = useMemo(() => sortBy(networks, ["label", "type"]), [networks])

  return { networks, sorted }
}
