import { NetworkId } from "extension-core"

import { useNetworkInfo } from "@ui/hooks/useNetworkInfo"

export const useNetworkCategory = (networkId: NetworkId) => {
  const networkInfo = useNetworkInfo(networkId)
  return networkInfo.type ?? null
}
