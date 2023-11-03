import useChain from "@ui/hooks/useChain"
import useToken from "@ui/hooks/useToken"

export const useGenesisHashFromTokenId = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)
  return chain?.genesisHash
}
