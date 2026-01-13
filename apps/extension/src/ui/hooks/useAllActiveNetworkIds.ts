import { useNetworks } from "@ui/state"
import { useMemo } from "react"

export const useActiveAssetDiscoveryNetworkIds = () => {
  const activeNetworks = useNetworks({ activeOnly: true, includeTestnets: false })

  return useMemo(() => activeNetworks.map((n) => n.id), [activeNetworks])
}
