import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { EditIcon, InfoIcon } from "@talismn/icons"
import type { ScaleApiSubmitMode } from "@talismn/sapi"
import { cn } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { MevShieldInfoDrawer } from "@ui/domains/Staking/Bittensor/BittensorBondModal/Drawers/BittensorMevShieldInfoDrawer"
import { BittensorSlippageDrawer } from "@ui/domains/Staking/Bittensor/BittensorBondModal/Drawers/BittensorSlippageDrawer"
import { useGetSubnetFee } from "@ui/domains/Staking/Bittensor/hooks/useGetSubnetFee"
import {
  HIGH_PRICE_IMPACT,
  TALISMAN_FEE_BITTENSOR,
  VERY_HIGH_PRICE_IMPACT,
} from "@ui/domains/Staking/Bittensor/utils/constants"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { useGetSeekDiscount } from "@ui/domains/Staking/Seek/hooks/useGetSeekDiscount"
import { SeekGetFeeDiscountsDrawer } from "@ui/domains/Staking/Seek/SeekGetFeeDiscountsDrawer"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useFeatureFlag } from "@ui/state"
import { Toggle } from "@ui/talisman-ui/components/Toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import {
  type ComponentProps,
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useMemo,
} from "react"
import { useTranslation } from "react-i18next"

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

export const SwapConfirmValidatorApyLabel: FC = () => {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1">
          {t("APY")}
          <InfoIcon />
        </div>
      </TooltipTrigger>
      <TooltipContent>{t("Estimated Annual Percentage Yield (APY)")}</TooltipContent>
    </Tooltip>
  )
}

export const SwapConfirmValidatorApyValue: FC<{ hotkey?: string; netuid?: number | null }> = ({
  hotkey,
  netuid,
}) => {
  const { t } = useTranslation()
  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData(netuid)

  const apy = useMemo(() => {
    const validator = combinedValidatorsData.find((validator) => validator.hotkey === hotkey)
    return Number(validator?.validatorYield?.thirty_day_apy ?? 0)
  }, [combinedValidatorsData, hotkey])

  const display = useMemo(() => (apy ? `${(apy * 100).toFixed(2)}%` : "N/A"), [apy])

  if (isLoading) {
    return <div className="animate-pulse rounded-xs bg-grey-700 text-grey-700">15.00%</div>
  }

  if (isError) {
    return <div className="text-alert-warn">{t("Unable to fetch APY data")}</div>
  }

  return <span className={cn(apy ? "text-alert-success" : "text-body-secondary")}>{display}</span>
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

export const SwapConfirmAlphaPriceValue: FC<{
  swapPrice?: string | bigint | null
  tokenId?: string
}> = ({ swapPrice, tokenId }) => {
  if (!tokenId) return null

  return (
    <TokensAndFiat
      planck={swapPrice ?? undefined}
      tokenId={tokenId}
      className="text-body-secondary"
      tokensClassName="text-body"
      noCountUp
    />
  )
}

export const SwapConfirmPriceImpactValue: FC<{ priceImpact?: number }> = ({ priceImpact }) => {
  return (
    <span
      className={cn(
        "text-body",
        !!priceImpact && priceImpact >= HIGH_PRICE_IMPACT && "text-orange-500",
        !!priceImpact && priceImpact >= VERY_HIGH_PRICE_IMPACT && "text-red-500"
      )}
    >
      {priceImpact?.toFixed(2)}%
    </span>
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

export const SwapConfirmMevShieldLabel: FC<{ containerId: string }> = ({ containerId }) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <button type="button" className="whitespace-nowrap hover:text-body" onClick={open}>
        <div>
          {t("MEV Shield")} <InfoIcon className="inline" />
        </div>
      </button>
      <MevShieldInfoDrawer isOpen={isOpen} onDismiss={close} containerId={containerId} />
    </>
  )
}

export const SwapConfirmMevShieldValue: FC<{
  withMevShield: boolean
  isMevShieldDisabled: boolean
  isMevShieldFeatureDisabled: boolean
  setIsMevProtectionEnabled: (enabled: boolean) => void
}> = ({
  withMevShield,
  isMevShieldDisabled,
  isMevShieldFeatureDisabled,
  setIsMevProtectionEnabled,
}) => {
  const { t } = useTranslation()

  const toggle = (
    <Toggle
      variant="tiny"
      checked={withMevShield}
      disabled={isMevShieldDisabled}
      onChange={(e) => setIsMevProtectionEnabled(e.target.checked)}
    />
  )

  if (isMevShieldFeatureDisabled)
    return (
      <Tooltip>
        <TooltipTrigger>{toggle}</TooltipTrigger>
        <TooltipContent>{t("MEV Shield is temporarily disabled")}</TooltipContent>
      </Tooltip>
    )

  return toggle
}

export const SwapConfirmFeeEstimateValue: FC<{
  feeEstimate?: bigint | null
  tokenId?: string
  isLoading?: boolean
  error?: unknown
}> = ({ feeEstimate, tokenId, isLoading, error }) => {
  return (
    <StakingFeeEstimate
      plancks={feeEstimate}
      tokenId={tokenId}
      isLoading={isLoading}
      error={error}
      noCountUp
    />
  )
}

const MAX_TOTAL_FEE_DISCOUNT = 1

export const SwapConfirmTalismanFeeLabel: FC<{
  netuid?: number | null
  containerId: string
  direction: "taoToAlpha" | "alphaToTao"
}> = ({ netuid, containerId, direction }) => {
  const { t } = useTranslation()
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")
  const { tier } = useGetSeekDiscount()
  const subnetFee = useGetSubnetFee({
    netuid: netuid ?? 0,
    direction,
  })

  const subnetFeeDiscount = useMemo(() => {
    if (subnetFee === TALISMAN_FEE_BITTENSOR) {
      return 0
    } else if (subnetFee === 0) {
      return MAX_TOTAL_FEE_DISCOUNT
    }
    const discountDiff = TALISMAN_FEE_BITTENSOR - subnetFee
    return discountDiff / TALISMAN_FEE_BITTENSOR
  }, [subnetFee])

  const totalFeeDiscount = useMemo(() => {
    if (subnetFeeDiscount === MAX_TOTAL_FEE_DISCOUNT) {
      return MAX_TOTAL_FEE_DISCOUNT
    }
    if (isSeekTaoDiscountEnabled) {
      return tier.discount + subnetFeeDiscount
    }
    return subnetFeeDiscount
  }, [subnetFeeDiscount, isSeekTaoDiscountEnabled, tier.discount])

  const totalDiscountPercent = useMemo(() => `${totalFeeDiscount * 100}%`, [totalFeeDiscount])
  const isSeekDrawerEnabled = useMemo(
    () => isSeekTaoDiscountEnabled && totalFeeDiscount < MAX_TOTAL_FEE_DISCOUNT,
    [isSeekTaoDiscountEnabled, totalFeeDiscount]
  )

  const { isOpen, open, close } = useOpenClose()

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div>{t("Talisman Fee")} </div>
      <Tooltip>
        <TooltipTrigger>
          <InfoIcon />
        </TooltipTrigger>
        <TooltipContent>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {subnetFee === 0
              ? t("Talisman doesn’t apply any fee to this transaction.")
              : t(`Talisman applies a ${TALISMAN_FEE_BITTENSOR}% fee to each transaction.`)}
          </span>
        </TooltipContent>
      </Tooltip>
      {(totalFeeDiscount > 0 || isSeekTaoDiscountEnabled) && (
        <button
          type="button"
          className={cn(
            "rounded-[43px] bg-[#D5FF5C] bg-opacity-[0.1] px-3 py-1",
            !isSeekDrawerEnabled && "cursor-default"
          )}
          onClick={isSeekDrawerEnabled ? open : undefined}
        >
          <div className="text-[#D5FF5C] text-[1rem]">
            {totalFeeDiscount > 0 ? (
              <>
                {totalDiscountPercent} {t("Off Fees")}
              </>
            ) : (
              t("Get Discount")
            )}
          </div>
        </button>
      )}
      <SeekGetFeeDiscountsDrawer
        isOpen={isOpen}
        onDismiss={close}
        onCloseModal={close}
        containerId={containerId}
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
      txMetadata={txMetadata}
      txInfo={txInfo}
      disabled={!canSubmit}
      mode={txMode}
    />
  )
}
