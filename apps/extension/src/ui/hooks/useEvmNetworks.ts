import {
  EvmNetworksQueryOptions,
  allEvmNetworksState,
  evmNetworksArrayQuery,
  evmNetworksMapQuery,
} from "@ui/atoms"
import { useRecoilValue, waitForAll } from "recoil"

// use only for networks list that is used to enable/disable networks
export const useAllEvmNetworks = () => useRecoilValue(allEvmNetworksState)

export const useEvmNetworks = (filter: EvmNetworksQueryOptions) => {
  const [evmNetworks, evmNetworksMap] = useRecoilValue(
    waitForAll([evmNetworksArrayQuery(filter), evmNetworksMapQuery(filter)])
  )

  return { evmNetworks, evmNetworksMap }
}
