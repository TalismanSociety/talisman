import type { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { TokensAndFiat } from "../../Asset/TokensAndFiat"

export const StakingFeeEstimate: FC<{
  isLoading?: boolean
  error?: unknown
  plancks: bigint | null | undefined
  tokenId: TokenId | null | undefined
  noCountUp?: boolean
  noFiat?: boolean
  className?: string
  tokensClassName?: string
}> = ({ error, isLoading, plancks, tokenId, noCountUp, noFiat, className, tokensClassName }) => {
  const { t } = useTranslation()
  return (
    <>
      {error ? (
        <div className={classNames("truncate text-alert-error", className)}>
          {t("Failed to estimate fee")}
        </div>
      ) : (plancks || plancks === 0n) && tokenId ? (
        <TokensAndFiat
          tokenId={tokenId}
          planck={plancks}
          tokensClassName={classNames("text-body", tokensClassName)}
          fiatClassName="text-body-secondary"
          noCountUp={noCountUp}
          noFiat={noFiat}
          className={classNames(isLoading && "animate-pulse", className)}
        />
      ) : isLoading ? (
        <div
          className={classNames(
            "animate-pulse rounded-xs bg-body-disabled text-body-disabled",
            className
          )}
        >
          0.0000 TKN ($0.00)
        </div>
      ) : null}
    </>
  )
}
