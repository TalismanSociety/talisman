import { useMemo } from "react"

import { useNetworks } from "@ui/state"

export const useActiveAssetDiscoveryNetworkIds = () => {
  const activeNetworks = useNetworks({ activeOnly: true, includeTestnets: false })

  return useMemo(() => activeNetworks.map((n) => n.id), [activeNetworks])
}
