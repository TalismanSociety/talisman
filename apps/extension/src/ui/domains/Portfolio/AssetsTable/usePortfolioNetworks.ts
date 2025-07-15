import { NetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useNetworkDisplayNamesMapById } from "@ui/state/networks"

export type PortfolioNetwork = {
  id: NetworkId
  name: string
}

export const usePortfolioNetworks = (ids: NetworkId[] | undefined) => {
  const networkNamesMap = useNetworkDisplayNamesMapById()

  const networks = useMemo(
    () =>
      ids
        ?.map((id) => ({ id, name: networkNamesMap[id] }))
        .filter((n): n is PortfolioNetwork => !!n.name) ?? [],
    [networkNamesMap, ids],
  )

  return networks
}
