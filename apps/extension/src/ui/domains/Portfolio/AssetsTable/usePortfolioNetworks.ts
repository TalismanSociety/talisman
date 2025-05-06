import { Chain, ChainId, EvmNetworkId, SimpleEvmNetwork } from "extension-core"
import { TFunction } from "i18next"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { getNetworkInfo } from "@ui/hooks/useNetworkInfo"
import { usePortfolio } from "@ui/state"

export type PortfolioNetwork = {
  id: ChainId | EvmNetworkId
  label: string | null
  type: string
}

const getPortfolioNetwork = (
  t: TFunction,
  id: ChainId | EvmNetworkId,
  chains?: Chain[],
  evmNetworks?: SimpleEvmNetwork[],
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
    [chains, evmNetworks, ids, t],
  )

  const sorted = useMemo(
    () =>
      networks
        .concat()
        .sort((n1, n2) => n1.type?.localeCompare(n2.type ?? "") ?? 0)
        .sort((n1, n2) => n1.label?.localeCompare(n2.label ?? "") ?? 0),
    [networks],
  )

  return { networks, sorted }
}
