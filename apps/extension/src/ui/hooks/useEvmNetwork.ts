import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { useMemo } from "react"
import { useDbCache } from "./useDbData"
import { useDbDataSubscription } from "./useDbDataSubscription"

export const useEvmNetwork = (id?: EvmNetworkId): EvmNetwork | CustomEvmNetwork | undefined => {
  // keep db table up to date
  useDbDataSubscription("evmNetworks")

  const { allEvmNetworks } = useDbCache()

  return useMemo(
    () => allEvmNetworks.find((evmNetwork) => Number(evmNetwork.id) === Number(id)),
    [allEvmNetworks, id]
  )
}
