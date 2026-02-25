import { useActiveNetworksState, useNetworkById } from "@ui/state"
import { isNetworkActive } from "extension-core"
import { useMemo } from "react"
import { BITTENSOR_NETWORK_ID } from "../subnets/constants"

export const useIsBittensorEnabled = () => {
  const activeNetworks = useActiveNetworksState()
  const bittensorNetwork = useNetworkById(BITTENSOR_NETWORK_ID)
  return useMemo(
    () => !!bittensorNetwork && isNetworkActive(bittensorNetwork, activeNetworks),
    [bittensorNetwork, activeNetworks]
  )
}
