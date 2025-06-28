import { useMemo } from "react"

import { useNetworkById, useToken } from "@ui/state"

export const useFeeToken = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  const feeTokenId = useMemo(() => {
    if (!network) return null

    return network?.platform === "polkadot" && network.overrideNativeTokenId
      ? network.overrideNativeTokenId
      : network.nativeTokenId
  }, [network])

  return useToken(feeTokenId)
}
