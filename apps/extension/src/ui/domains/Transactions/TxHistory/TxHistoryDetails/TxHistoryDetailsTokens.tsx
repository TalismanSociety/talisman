import { FC } from "react"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

export const TxHistoryDetailsTokens: FC<{
  value: bigint | string
  tokenId: string
}> = ({ value, tokenId }) => {
  return <TokensAndFiat planck={value} tokenId={tokenId} />
}
