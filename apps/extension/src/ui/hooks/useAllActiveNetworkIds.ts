import { useMemo } from "react"

import { useChains, useEvmNetworks } from "@ui/state"

export const useActiveAssetDiscoveryNetworkIds = () => {
  const evmNetworks = useEvmNetworks({ activeOnly: true, includeTestnets: false })
  const chains = useChains({ activeOnly: true, includeTestnets: false })
  return useMemo(
    () => evmNetworks.map((n) => n.id).concat(chains.map((n) => n.id)),
    [chains, evmNetworks],
  )
}
