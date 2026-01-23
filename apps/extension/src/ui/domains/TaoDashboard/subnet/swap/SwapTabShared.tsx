import type { TokenId } from "@talismn/chaindata-provider"
import { EditIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import type { FC, PropsWithChildren, ReactNode } from "react"
import { useTranslation } from "react-i18next"

type SwapInputsContainerProps = PropsWithChildren<{
  label: ReactNode
}>

export const SwapInputsContainer: FC<SwapInputsContainerProps> = ({ label, children }) => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className="pl-2 text-body-secondary text-sm">{label}</div>
    <div className="w-full overflow-hidden">{children}</div>
  </div>
)

type SwapDetailsRowProps = PropsWithChildren<{
  label: ReactNode
  valueClassName?: string
}>

export const SwapDetailsRow: FC<SwapDetailsRowProps> = ({ label, valueClassName, children }) => (
  <div className="flex h-14 w-full items-center justify-between text-sm">
    <div className="text-body-secondary">{label}</div>
    <div className={valueClassName}>{children}</div>
  </div>
)

type SwapPriceImpactProps = {
  priceImpact: number | null | undefined
  isLoading?: boolean
}

export const SwapPriceImpact: FC<SwapPriceImpactProps> = ({ priceImpact, isLoading }) => {
  const { t } = useTranslation()

  if (typeof priceImpact === "number") {
    return (
      <div
        className={cn(
          isLoading && "animate-pulse",
          priceImpact > 0.5 && "text-alert-warn",
          priceImpact > 2 && "text-alert-error"
        )}
      >
        ~{priceImpact.toFixed(2)}%
      </div>
    )
  }

  if (isLoading)
    return <div className="animate-pulse rounded-xs bg-body-disabled text-body-disabled">0.00%</div>

  return t("N/A")
}

type SwapFeeEstimateProps = {
  tokenId?: TokenId | null
  feeEstimate?: bigint | null
  isLoading?: boolean
  error?: unknown
}

export const SwapFeeEstimate: FC<SwapFeeEstimateProps> = ({
  tokenId,
  feeEstimate,
  isLoading,
  error,
}) => {
  const { t } = useTranslation()

  if (!tokenId) return null

  if (typeof feeEstimate === "bigint")
    return (
      <TokensAndFiat
        tokenId={tokenId}
        planck={feeEstimate}
        className={cn("text-body-secondary", isLoading && "animate-pulse")}
        tokensClassName="text-body"
      />
    )

  if (isLoading) {
    return (
      <TokensAndFiat
        tokenId={tokenId}
        planck={1_234_567n} // dummy placeholder value
        className="animate-pulse rounded-xs bg-body-disabled text-body-disabled"
      />
    )
  }

  if (error) {
    return <div className="text-alert-warn">{t("Failed to estimate fee")}</div>
  }

  return <div>{t("N/A")}</div>
}

type SwapSlippageRowProps = {
  slippage: number
  onEdit?: () => void
}

export const SwapSlippageRow: FC<SwapSlippageRowProps> = ({ slippage, onEdit }) => {
  if (onEdit) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="flex cursor-pointer items-center gap-2 rounded-xl pl-2 font-light"
      >
        <EditIcon />
        <div>{slippage.toFixed(2)}%</div>
      </button>
    )
  }

  return <div>{slippage.toFixed(2)}%</div>
}
