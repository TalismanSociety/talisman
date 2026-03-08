import type { TokenId } from "@talismn/chaindata-provider"
import { useToken } from "@ui/state/chaindata"
import type { FC } from "react"

/**
 * To be used when a meaningful symbol is needed for display purposes.
 */
export const TokenDisplaySymbol: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const token = useToken(tokenId)

  if (!token) return null

  if (token.type === "substrate-dtao") return token.netuid ? token.name : token.symbol

  return token.symbol
}
