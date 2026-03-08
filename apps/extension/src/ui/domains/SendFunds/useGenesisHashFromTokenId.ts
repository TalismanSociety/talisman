import { useNetworkById, useToken } from "@ui/state/chaindata"

export const useGenesisHashFromTokenId = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const chain = useNetworkById(token?.networkId, "polkadot")
  return chain?.genesisHash
}
