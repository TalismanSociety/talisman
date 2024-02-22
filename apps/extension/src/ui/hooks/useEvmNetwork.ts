import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { useMemo } from "react"

import { useAllEvmNetworksMap } from "./useEvmNetworks"

export const useEvmNetwork = (
  id: EvmNetworkId | undefined | null
): EvmNetwork | CustomEvmNetwork | null => {
  // DON'T DO THIS (suspenses once for each key)
  // return useAtomValue(evmNetworkAtomFamily(id))

  const evmNetworksMap = useAllEvmNetworksMap()
  return useMemo(() => (id && evmNetworksMap[id]) || null, [evmNetworksMap, id])
}
