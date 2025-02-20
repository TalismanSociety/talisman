import { TokenId } from "@talismn/chaindata-provider"
import { FC } from "react"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useToken } from "@ui/state"

export const SummaryTokenSymbolDisplay: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const token = useToken(tokenId)

  if (!token) throw new Error("Missing data")

  return (
    <span className="text-body shrink-0 whitespace-nowrap">
      <TokenLogo tokenId={tokenId} className="mr-[0.3em] inline-block size-[1.2em] align-sub" />
      <span>{token.symbol}</span>
    </span>
  )
}
