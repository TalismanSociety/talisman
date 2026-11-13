import { EditIcon, InfoIcon } from "@talismn/icons"
import type { ScaleApiSubmitMode } from "@talismn/sapi"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { BittensorSlippageDrawer } from "@ui/domains/Staking/Bittensor/BittensorBondModal/Drawers/BittensorSlippageDrawer"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/Bittensor/hooks/useCombinedBittensorValidatorsData"
import { formatValidatorApy } from "@ui/domains/Staking/Bittensor/utils/formatValidatorApy"
import { useGetSeekDiscount } from "@ui/domains/Staking/Seek/hooks/useGetSeekDiscount"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { flows } from "@ui/hooks/analytics/flows"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { cn } from "@ui/util/cn"
import {
  type ComponentProps,
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useMemo,
} from "react"
import { useTranslation } from "react-i18next"
import { useTaoDashboardNetworkId } from "../../shared/TaoDashboardNetworkProvider"
import { FeeBreakdownTooltipContent } from "./SwapTabShared"

export const SwapConfirmContainer: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => {
  return (
    <div className={cn(`rounded bg-grey-900 p-8 py-6 text-body-secondary`, className)}>
      {children}
    </div>
  )
}

export const SwapConfirmFieldRow: FC<
  PropsWithChildren<{
    label: ReactNode
    variant?: "default" | "small" | "large"
    className?: string
  }>
> = ({ label, variant = "default", children, className }) => {
  return (
    <div
      className={cn(
        "flex h-12 w-full items-center justify-between gap-4 overflow-x-hidden text-sm",
        variant === "large" && "h-16 text-base",
        variant === "small" && "h-12 text-sm",
        className
      )}
    >
      <div className="text-body-secondary">{label}</div>
      <div className="truncate text-white">{children}</div>
    </div>
  )
}

export const SwapConfirmFieldSeparator: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("flex h-px w-full shrink-0 flex-col justify-center", className)}>
      <hr className="text-grey-800" />
    </div>
  )
}

export const SwapConfirmAmountInValue: FC<{
  tokenId?: string
  valueIn?: string | bigint | null
}> = ({ tokenId, valueIn }) => {
  if (!tokenId || !valueIn) return null

  return (
    <TokensAndFiat
      tokenId={tokenId}
      planck={valueIn ?? undefined}
      noCountUp
      withLogo
      className="text-body-secondary"
      tokensClassName="text-body"
      logoClassName="size-10"
    />
  )
}

export const SwapConfirmValidatorApyValue: FC<{ hotkey?: string; netuid?: number | null }> = ({
  hotkey,
  netuid,
}) => {
  const { t } = useTranslation()
  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData(
    useTaoDashboardNetworkId(),
    netuid
  )

  const apy = useMemo(() => {
    const validator = combinedValidatorsData.find((validator) => validator.hotkey === hotkey)
    return validator?.validatorYield?.thirty_day_apy ?? null
  }, [combinedValidatorsData, hotkey])

  if (isLoading) {
    return <div className="animate-pulse rounded-xs bg-grey-700 text-grey-700">15.00%</div>
  }

  if (isError) {
    return <div className="text-alert-warn">{t("Unable to fetch APY data")}</div>
  }

  return (
    <span className={cn(apy ? "text-alert-success" : "text-body-secondary")}>
      {formatValidatorApy(apy) ?? t("N/A")}
    </span>
  )
}

export const SwapConfirmEstimatedOutputValue: FC<{
  tokenId?: string
  valueOut?: string | bigint | null
}> = ({ tokenId, valueOut }) => {
  return (
    <TokensAndFiat
      planck={valueOut ?? undefined}
      tokenId={tokenId}
      noCountUp
      tokensClassName="text-body"
    />
  )
}

export const SwapConfirmSlippageToleranceValue: FC<{
  slippage: number
  netuid?: number | null
  containerId: string
}> = ({ slippage, netuid, containerId }) => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={"flex cursor-pointer items-center gap-2 rounded-xl pl-2 font-light"}
      >
        <EditIcon />
        <div>{slippage.toFixed(2)}%</div>
      </button>
      <BittensorSlippageDrawer
        isOpen={isOpen}
        onClose={close}
        containerId={containerId}
        netuid={netuid ?? null}
      />
    </>
  )
}

export const SwapConfirmFeeEstimateValue: FC<{
  feeEstimate?: bigint | null
  tokenId?: string
  isLoading?: boolean
  error?: unknown
  withMevShield?: boolean
  innerFeeEstimate?: bigint | null
  mevShieldFeeEstimate?: bigint | null
}> = ({
  feeEstimate,
  tokenId,
  isLoading,
  error,
  withMevShield,
  innerFeeEstimate,
  mevShieldFeeEstimate,
}) => {
  const showBreakdown =
    withMevShield &&
    tokenId &&
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
      <StakingFeeEstimate
        plancks={feeEstimate}
        tokenId={tokenId}
        isLoading={isLoading}
        error={error}
        noCountUp
      />
    </div>
  )
}

export const SwapConfirmTalismanFeeValue: FC<{
  talismanFee?: bigint | null
  tokenId?: string
  isLoading?: boolean
  error?: unknown
}> = ({ talismanFee, tokenId, isLoading, error }) => {
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")
  const { tier } = useGetSeekDiscount()

  return (
    <StakingFeeEstimate
      plancks={talismanFee}
      tokenId={tokenId}
      isLoading={isLoading}
      error={error}
      tokensClassName={tier.discount > 0 && isSeekTaoDiscountEnabled ? "text-[#D5FF5C]" : ""}
      noCountUp
      noFiat
    />
  )
}

type SapiSendButtonProps = ComponentProps<typeof SapiSendButton>

export const SwapConfirmSendButton: FC<{
  label: string
  containerId: string
  payload: SapiSendButtonProps["payload"]
  txMetadata: SapiSendButtonProps["txMetadata"]
  txInfo: SapiSendButtonProps["txInfo"]
  txMode: ScaleApiSubmitMode
  canSubmit: boolean
  onSubmit: (hash: `0x${string}`, innerHash?: `0x${string}` | undefined) => void
  onClose: () => void
}> = ({
  label,
  containerId,
  payload,
  txMetadata,
  txInfo,
  canSubmit,
  txMode,
  onSubmit,
  onClose,
}) => {
  const handleSubmit = useCallback(
    (hash: `0x${string}`, innerHash?: `0x${string}` | undefined) => {
      onSubmit(hash, innerHash)
      onClose()
    },
    [onSubmit, onClose]
  )

  return (
    <SapiSendButton
      containerId={containerId}
      label={label}
      payload={payload}
      onSubmitted={handleSubmit}
      onError={flows.tao_trade.failed}
      txMetadata={txMetadata}
      txInfo={txInfo}
      disabled={!canSubmit}
      mode={txMode}
    />
  )
}
