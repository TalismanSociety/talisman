import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { FC } from "react"

import { TokensAndFiat } from "../../Asset/TokensAndFiat"

export const StakingFeeEstimate: FC<{
  isLoading?: boolean
  error?: unknown
  plancks: bigint | null | undefined
  tokenId: TokenId | null | undefined
  noCountUp?: boolean
  className?: string
}> = ({ error, isLoading, plancks, tokenId, noCountUp, className }) => {
  return (
    <>
      {error ? (
        <div className={classNames("text-alert-error truncate", className)}>
          Failed to estimate fee
        </div>
      ) : plancks && tokenId ? (
        <TokensAndFiat
          tokenId={tokenId}
          planck={plancks}
          tokensClassName="text-body"
          fiatClassName="text-body-secondary"
          noCountUp={noCountUp}
          className={classNames(isLoading && "animate-pulse", className)}
        />
      ) : isLoading ? (
        <div
          className={classNames(
            "text-body-disabled bg-body-disabled rounded-xs animate-pulse",
            className,
          )}
        >
          0.0000 TKN ($0.00)
        </div>
      ) : null}
    </>
  )
}
