import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"

import { useEvmNetworks } from "./useEvmNetworks"

export const useEvmNetwork = (id?: EvmNetworkId): EvmNetwork | CustomEvmNetwork | undefined => {
  const { evmNetworksMap } = useEvmNetworks("all")

  return id ? evmNetworksMap[id] : undefined
}
