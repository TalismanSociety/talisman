import { useNetworkById, useToken } from "@ui/state/chaindata"

export const useFeeToken = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  return useToken(network?.nativeTokenId)
}
