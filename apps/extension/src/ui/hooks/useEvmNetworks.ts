import {
  evmNetworksWithTestnetsMapState,
  evmNetworksWithTestnetsState,
  evmNetworksWithoutTestnetsMapState,
  evmNetworksWithoutTestnetsState,
} from "@ui/atoms/chaindata"
import { useMemo } from "react"
import { useRecoilValue } from "recoil"

export const useEvmNetworks = (withTestnets: boolean) => {
  const evmNetworksWithTestnets = useRecoilValue(evmNetworksWithTestnetsState)
  const evmNetworksWithoutTestnets = useRecoilValue(evmNetworksWithoutTestnetsState)
  const evmNetworksWithTestnetsMap = useRecoilValue(evmNetworksWithTestnetsMapState)
  const evmNetworksWithoutTestnetsMap = useRecoilValue(evmNetworksWithoutTestnetsMapState)

  return useMemo(
    () => ({
      evmNetworks: withTestnets ? evmNetworksWithTestnets : evmNetworksWithoutTestnets,
      evmNetworksMap: withTestnets ? evmNetworksWithTestnetsMap : evmNetworksWithoutTestnetsMap,
    }),
    [
      evmNetworksWithTestnets,
      evmNetworksWithTestnetsMap,
      evmNetworksWithoutTestnets,
      evmNetworksWithoutTestnetsMap,
      withTestnets,
    ]
  )
}
