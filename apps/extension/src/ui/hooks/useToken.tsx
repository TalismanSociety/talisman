import useTokens from "./useTokens"

export const useToken = (tokenId?: string | null) => {
  const { tokensMap } = useTokens(false)

  return tokenId ? tokensMap[tokenId] : undefined
}

export default useToken
