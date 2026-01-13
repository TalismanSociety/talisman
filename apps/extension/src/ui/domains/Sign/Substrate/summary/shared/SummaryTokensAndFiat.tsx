import type { TokenId } from "@talismn/chaindata-provider"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import type { FC } from "react"

import type { SummaryDisplayMode } from "../../types"

export const SummaryTokensAndFiat: FC<{
  tokenId: TokenId
  planck: bigint | string
  mode: SummaryDisplayMode
  noFiat?: boolean // used to force, such as for ED
}> = ({ tokenId, planck, mode, noFiat }) => {
  return (
    <TokensAndFiat
      tokenId={tokenId}
      planck={planck}
      noCountUp
      withLogo
      noFiat={!!noFiat || mode === "compact"}
      noTooltip={mode !== "block"}
      className="whitespace-nowrap"
      tokensClassName="text-body"
    />
  )
}
