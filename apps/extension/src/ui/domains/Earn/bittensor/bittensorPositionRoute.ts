import { parseSubDTaoTokenId, type TokenId } from "@talismn/chaindata-provider"

export const getBittensorPositionDetailUrl = (tokenId: TokenId, address: string) =>
  `/earn/positions/bittensor/${encodeURIComponent(tokenId)}/${encodeURIComponent(address)}`

export const parseBittensorPositionRoute = (
  tokenId: string | undefined,
  address: string | undefined
): { tokenId: TokenId; address: string } | null => {
  if (!tokenId || !address) return null
  try {
    return parseSubDTaoTokenId(tokenId).hotkey ? { tokenId, address } : null
  } catch {
    return null
  }
}
