import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { useMemo } from "react"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export const useEvmNetwork = (id?: EvmNetworkId): EvmNetwork | CustomEvmNetwork | undefined => {
  // keep db table up to date
  useDbCacheSubscription("evmNetworks")

  const { allEvmNetworks } = useDbCache()

  return useMemo(
    () => allEvmNetworks.find((evmNetwork) => Number(evmNetwork.id) === Number(id)),
    [allEvmNetworks, id]
  )
}
