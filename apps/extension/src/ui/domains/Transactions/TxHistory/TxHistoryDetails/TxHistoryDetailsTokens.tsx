import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import type { FC } from "react"

export const TxHistoryDetailsTokens: FC<{
  value: bigint | string
  tokenId: string
}> = ({ value, tokenId }) => {
  return <TokensAndFiat planck={value} tokenId={tokenId} />
}
