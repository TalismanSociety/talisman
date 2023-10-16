import {
  allEvmNetworksMapState,
  allEvmNetworksState,
  evmNetworksWithTestnetsMapState,
  evmNetworksWithTestnetsState,
  evmNetworksWithoutTestnetsMapState,
  evmNetworksWithoutTestnetsState,
} from "@ui/atoms/chaindata"
import { useMemo } from "react"
import { useRecoilValue } from "recoil"

// use only for networks list that is used to enable/disable networks
export const useAllEvmNetworks = () => useRecoilValue(allEvmNetworksState)

type EvmNetworksFilter = "all" | "enabledWithTestnets" | "enabledWithoutTestnets"

export const useEvmNetworks = (filter: EvmNetworksFilter) => {
  const allEvmNetworks = useRecoilValue(allEvmNetworksState)
  const evmNetworksWithTestnets = useRecoilValue(evmNetworksWithTestnetsState)
  const evmNetworksWithoutTestnets = useRecoilValue(evmNetworksWithoutTestnetsState)
  const allEvmNetworksMap = useRecoilValue(allEvmNetworksMapState)
  const evmNetworksWithTestnetsMap = useRecoilValue(evmNetworksWithTestnetsMapState)
  const evmNetworksWithoutTestnetsMap = useRecoilValue(evmNetworksWithoutTestnetsMapState)

  return useMemo(() => {
    switch (filter) {
      case "all":
        return { evmNetworks: allEvmNetworks, evmNetworksMap: allEvmNetworksMap }
      case "enabledWithTestnets":
        return {
          evmNetworks: evmNetworksWithTestnets,
          evmNetworksMap: evmNetworksWithTestnetsMap,
        }
      case "enabledWithoutTestnets":
      default:
        return {
          evmNetworks: evmNetworksWithoutTestnets,
          evmNetworksMap: evmNetworksWithoutTestnetsMap,
        }
    }
  }, [
    allEvmNetworks,
    allEvmNetworksMap,
    evmNetworksWithTestnets,
    evmNetworksWithTestnetsMap,
    evmNetworksWithoutTestnets,
    evmNetworksWithoutTestnetsMap,
    filter,
  ])
}
