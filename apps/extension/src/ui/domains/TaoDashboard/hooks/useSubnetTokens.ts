import { subDTaoTokenId, subNativeTokenId } from "@talismn/chaindata-provider"
import { useToken } from "@ui/state"
import { useMemo } from "react"
import { BITTENSOR_NETWORK_ID } from "../subnets/constants"

export const useSubnetTokens = (netuid: number) => {
  const alphaTokenId = useMemo(() => subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid), [netuid])
  const alphaToken = useToken(alphaTokenId, "substrate-dtao")

  const taoTokenId = useMemo(() => subNativeTokenId(BITTENSOR_NETWORK_ID), [])
  const taoToken = useToken(taoTokenId, "substrate-native")

  return { alphaTokenId, alphaToken, taoTokenId, taoToken }
}
