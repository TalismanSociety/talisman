import { useNetworkById, useToken } from "@ui/state"

export const useFeeToken = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  return useToken(network?.nativeTokenId)
}
