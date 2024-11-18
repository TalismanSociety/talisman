import { TokenId } from "@talismn/chaindata-provider"
import { FC } from "react"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

export const SummaryTokensAndFiat: FC<{
  tokenId: TokenId
  planck: bigint | string
  withFiat: boolean
}> = ({ tokenId, planck, withFiat }) => {
  return (
    <TokensAndFiat
      tokenId={tokenId}
      planck={planck}
      noCountUp
      withLogo
      noFiat={!withFiat}
      className="whitespace-nowrap"
      tokensClassName="text-body"
    />
  )
}
