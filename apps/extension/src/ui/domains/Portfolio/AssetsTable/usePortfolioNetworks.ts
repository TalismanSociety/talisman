import { NetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { getNetworkInfo } from "@ui/hooks/useNetworkInfo"
import { useNetworksMapById } from "@ui/state"

export type PortfolioNetwork = {
  id: NetworkId
  label: string | null
  type: string
}

export const usePortfolioNetworks = (ids: NetworkId[] | undefined) => {
  const networksMap = useNetworksMapById()
  const { t } = useTranslation()

  const networks = useMemo(
    () =>
      ids?.map((id) => {
        const { label, type } = getNetworkInfo(t, { networkId: id, networks: networksMap })
        return { id, label, type }
      }) ?? [],
    [networksMap, ids, t],
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
