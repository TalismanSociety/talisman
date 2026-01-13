import type { TokenId } from "@talismn/chaindata-provider"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useToken } from "@ui/state"
import type { FC } from "react"

export const SummaryTokenSymbolDisplay: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const token = useToken(tokenId)

  if (!token) throw new Error("Missing data")

  return (
    <span className="shrink-0 whitespace-nowrap text-body">
      <TokenLogo tokenId={tokenId} className="mr-[0.3em] inline-block size-[1.2em] align-sub" />
      <span>{token.symbol}</span>
    </span>
  )
}
