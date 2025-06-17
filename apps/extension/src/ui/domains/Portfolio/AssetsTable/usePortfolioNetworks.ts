import { NetworkId } from "extension-core"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { getNetworkInfo } from "@ui/hooks/useNetworkInfo"
import { useNetworks } from "@ui/state"

export type PortfolioNetwork = {
  id: NetworkId
  label: string | null
  type: string
}

// const getPortfolioNetwork = (
//   t: TFunction,
//   id: NetworkId,
//   chains?: Chain[],
//   evmNetworks?: SimpleEvmNetwork[],
// ): PortfolioNetwork => {
//   const chain = chains?.find((c) => c.id === id)
//   const evmNetwork = evmNetworks?.find((n) => n.id === id)
//   const relay = chains?.find((c) => c.id === chain?.relay?.id)
//   const { label, type } = getNetworkInfo(t, id, networks { chain, evmNetwork, relay })

//   return { id, label, type }
// }

export const usePortfolioNetworks = (ids: NetworkId[] | undefined) => {
  const allNetworks = useNetworks()
  const { t } = useTranslation()

  const networks = useMemo(
    () =>
      ids?.map((id) => {
        const { label, type } = getNetworkInfo(t, { networkId: id, networks: allNetworks })
        return { id, label, type }
      }) ?? [],
    [allNetworks, ids, t],
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
