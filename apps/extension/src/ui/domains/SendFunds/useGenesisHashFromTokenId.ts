import { useChain, useToken } from "@ui/state"

export const useGenesisHashFromTokenId = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const chain = useChain(token?.networkId)
  return chain?.genesisHash
}
