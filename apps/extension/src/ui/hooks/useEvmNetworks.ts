import {
  EvmNetworksQueryOptions,
  allEvmNetworksState,
  evmNetworksArrayQuery,
  evmNetworksMapQuery,
} from "@ui/atoms"
import { useRecoilValue } from "recoil"

// use only for networks list that is used to enable/disable networks
export const useAllEvmNetworks = () => useRecoilValue(allEvmNetworksState)

export const useEvmNetworks = (filter: EvmNetworksQueryOptions) => {
  const evmNetworks = useRecoilValue(evmNetworksArrayQuery(filter))
  const evmNetworksMap = useRecoilValue(evmNetworksMapQuery(filter))

  return { evmNetworks, evmNetworksMap }
}
