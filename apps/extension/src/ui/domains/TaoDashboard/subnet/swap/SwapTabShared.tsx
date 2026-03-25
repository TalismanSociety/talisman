import type { TokenId } from "@talismn/chaindata-provider"
import { EditIcon, InfoIcon } from "@talismn/icons"
import { planckToTokens } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type { FC, PropsWithChildren, ReactNode } from "react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

type SwapInputsContainerProps = PropsWithChildren<{
  label: ReactNode
  right?: ReactNode
}>

export const SwapInputsContainer: FC<SwapInputsContainerProps> = ({ label, right, children }) => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className="flex items-center justify-between pr-6 pl-2 text-body-secondary text-sm">
      <div>{label}</div>
      {right}
    </div>
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
  withMevShield?: boolean
  innerFeeEstimate?: bigint | null
  mevShieldFeeEstimate?: bigint | null
}

export const SwapFeeEstimate: FC<SwapFeeEstimateProps> = ({
  tokenId,
  feeEstimate,
  isLoading,
  error,
  withMevShield,
  innerFeeEstimate,
  mevShieldFeeEstimate,
}) => {
  const { t } = useTranslation()

  if (!tokenId) return null

  if (typeof feeEstimate === "bigint") {
    const showBreakdown =
      withMevShield &&
      typeof innerFeeEstimate === "bigint" &&
      typeof mevShieldFeeEstimate === "bigint"

    return (
      <div className="flex items-center gap-2">
        {showBreakdown && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-body-secondary">
                <InfoIcon className="cursor-help" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <FeeBreakdownTooltipContent
                tokenId={tokenId}
                innerFeeEstimate={innerFeeEstimate}
                mevShieldFeeEstimate={mevShieldFeeEstimate}
              />
            </TooltipContent>
          </Tooltip>
        )}
        <TokensAndFiat
          tokenId={tokenId}
          planck={feeEstimate}
          className={cn("text-body-secondary", isLoading && "animate-pulse")}
          tokensClassName="text-body"
        />
      </div>
    )
  }

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

const FEE_DISPLAY_DECIMALS = 9

export const FeeBreakdownTooltipContent: FC<{
  tokenId: string
  innerFeeEstimate: bigint
  mevShieldFeeEstimate: bigint
}> = ({ tokenId, innerFeeEstimate, mevShieldFeeEstimate }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)

  const format = useMemo(() => {
    if (!token) return (planck: bigint) => String(planck)
    return (planck: bigint) => {
      const tokens = planckToTokens(planck.toString(), token.decimals)
      return `${Number(tokens).toFixed(FEE_DISPLAY_DECIMALS)} ${token.symbol}`
    }
  }, [token])

  return (
    <div className="flex flex-col gap-1 tabular-nums">
      <div className="flex items-center justify-between gap-4">
        <span>{t("Transaction")}</span>
        <span>{format(innerFeeEstimate)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span>{t("MEV Shield")}</span>
        <span>{format(mevShieldFeeEstimate)}</span>
      </div>
      <hr className="my-1 text-grey-700" />
      <div className="flex items-center justify-between gap-4">
        <span>{t("Total")}</span>
        <span>{format(innerFeeEstimate + mevShieldFeeEstimate)}</span>
      </div>
    </div>
  )
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
