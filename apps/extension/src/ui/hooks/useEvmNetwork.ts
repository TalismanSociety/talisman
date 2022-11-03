import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { useMemo } from "react"

import { useEvmNetworks } from "./useEvmNetworks"

export const useEvmNetwork = (id?: EvmNetworkId): EvmNetwork | CustomEvmNetwork | undefined => {
  const evmNetworks = useEvmNetworks()

  return useMemo(
    () => evmNetworks.find((evmNetwork) => Number(evmNetwork.id) === Number(id)),
    [evmNetworks, id]
  )
}
