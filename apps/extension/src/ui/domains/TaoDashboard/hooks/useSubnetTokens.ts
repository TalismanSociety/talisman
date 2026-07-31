import { type NetworkId, subDTaoTokenId, subNativeTokenId } from "@talismn/chaindata-provider"
import { useToken } from "@ui/state/chaindata"
import { useMemo } from "react"

export const useSubnetTokens = (networkId: NetworkId, netuid: number) => {
  const alphaTokenId = useMemo(() => subDTaoTokenId(networkId, netuid), [networkId, netuid])
  const alphaToken = useToken(alphaTokenId, "substrate-dtao")

  const taoTokenId = useMemo(() => subNativeTokenId(networkId), [networkId])
  const taoToken = useToken(taoTokenId, "substrate-native")

  return { alphaTokenId, alphaToken, taoTokenId, taoToken }
}
