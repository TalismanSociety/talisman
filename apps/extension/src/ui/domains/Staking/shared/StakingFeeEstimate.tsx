import type { TokenId } from "@talismn/chaindata-provider"
import { cn } from "@ui/util/cn"

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
        <div className={cn("truncate text-alert-error", className)}>
          {t("Failed to estimate fee")}
        </div>
      ) : (plancks || plancks === 0n) && tokenId ? (
        <TokensAndFiat
          tokenId={tokenId}
          planck={plancks}
          className={cn("text-body-secondary", isLoading && "animate-pulse", className)}
          tokensClassName={cn("text-body", tokensClassName)}
          noCountUp={noCountUp}
          noFiat={noFiat}
        />
      ) : isLoading ? (
        <div
          className={cn("animate-pulse rounded-xs bg-body-disabled text-body-disabled", className)}
        >
          0.0000 TKN ($0.00)
        </div>
      ) : null}
    </>
  )
}
