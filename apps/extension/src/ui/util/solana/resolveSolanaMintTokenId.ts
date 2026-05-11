import { solSplTokenId, solToken2022TokenId, type TokenId } from "@talismn/chaindata-provider"

export const resolveSolanaMintTokenId = (
  networkId: string,
  mintAddress: string,
  tokensMap: Record<string, unknown>
): TokenId | null => {
  const token2022Id = solToken2022TokenId(networkId, mintAddress)
  if (tokensMap[token2022Id]) return token2022Id

  const splId = solSplTokenId(networkId, mintAddress)
  if (tokensMap[splId]) return splId

  return null
}
