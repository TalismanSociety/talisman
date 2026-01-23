import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { EditIcon, InfoIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
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
import { type FC, type PropsWithChildren, type ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  Modal,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOpenClose,
  WizardModalDialog,
} from "talisman-ui"
import { useSwapSell } from "./SwapSellProvider"

const CONTAINER_ID = "tao-swap-confirm-modal"

export const SwapSellConfirmModal: FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => (
  <Modal isOpen={isOpen}>
    <ModalContent onClose={onClose} />
  </Modal>
)
const ModalContent: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()

  return (
    <PopupSizeModalContainer id={CONTAINER_ID}>
      <WizardModalDialog
        title={t("Confirm Sell")}
        className="size-full border-none"
        onCloseClick={onClose}
      >
        <div className="flex size-full flex-col">
          <div className="flex grow flex-col gap-8">
            <Container>
              <div className="flex flex-col">
                <FieldRow label={t("Amount")} variant="large">
                  <AmountInValue />
                </FieldRow>
                <FieldRow label={t("Account")} variant="large">
                  <SpenderValue />
                </FieldRow>
                <FieldSeparator className="py-4" />
                <FieldRow label={t("Subnet")}>
                  <SubnetValue />
                </FieldRow>
                <FieldRow label={t("Validator")}>
                  <ValidatorValue />
                </FieldRow>
                <FieldRow label={<ValidatorApyLabel />}>
                  <ValidatorApyValue />
                </FieldRow>
              </div>
              <FieldRow label={t("Estimated amount")}>
                <EstimatedOutputValue />
              </FieldRow>
            </Container>
            <Container>
              <FieldRow label={t("Alpha Price")}>
                <AlphaPriceValue />
              </FieldRow>
              <FieldRow label={t("Price Impact")}>
                <PriceImpactValue />
              </FieldRow>
              <FieldRow label={t("Slippage Tolerance")}>
                <SlippageToleranceValue />
              </FieldRow>
              <FieldRow label={<MevShieldLabel />}>
                <MevShieldValue />
              </FieldRow>
            </Container>
            <Container>
              <FieldRow label={t("Estimated Fee")}>
                <FeeEstimateValue />
              </FieldRow>
              <FieldRow label={<TalismanFeeLabel />}>
                <TalismanFeeValue />
              </FieldRow>
            </Container>
          </div>
          <SendButton onClose={onClose} />
        </div>
      </WizardModalDialog>
    </PopupSizeModalContainer>
  )
}

const Container: FC<PropsWithChildren<{ className?: string }>> = ({ children, className }) => {
  return (
    <div className={cn(`rounded bg-grey-900 p-8 py-6 text-body-secondary`, className)}>
      {children}
    </div>
  )
}

const FieldRow: FC<
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

const FieldSeparator: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("flex h-px w-full shrink-0 flex-col justify-center", className)}>
      <hr className="text-grey-800" />
    </div>
  )
}

const AmountInValue = () => {
  const { tokenIdIn, valueIn } = useSwapSell()

  if (!tokenIdIn || !valueIn) return null

  return (
    <TokensAndFiat
      tokenId={tokenIdIn}
      planck={valueIn}
      noCountUp
      withLogo
      className="text-body-secondary"
      tokensClassName="text-body"
      logoClassName="size-10"
    />
  )
}

const SpenderValue = () => {
  const { selectedPosition } = useSwapSell()

  if (!selectedPosition) return null

  return (
    <AccountDisplay
      ss58Format={42}
      address={selectedPosition.account.address}
      iconClassName="text-[2rem]"
    />
  )
}

const SubnetValue = () => {
  const { t } = useTranslation()
  const { netuid, tokenIn } = useSwapSell()

  return tokenIn?.subnetName || t("Subnet {{netuid}}", { netuid })
}

const ValidatorValue = () => {
  const { tokenIn } = useSwapSell()

  return <BittensorValidatorName hotkey={tokenIn?.hotkey} />
}

const ValidatorApyLabel = () => {
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
const ValidatorApyValue = () => {
  const { t } = useTranslation()
  const { tokenIn, netuid } = useSwapSell()
  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData(netuid)

  const apy = useMemo(() => {
    const validator = combinedValidatorsData.find(
      (validator) => validator.hotkey === tokenIn?.hotkey
    )
    return Number(validator?.validatorYield?.thirty_day_apy ?? 0)
  }, [combinedValidatorsData, tokenIn?.hotkey])

  const display = useMemo(() => (apy ? `${(apy * 100).toFixed(2)}%` : "N/A"), [apy])

  if (isLoading) {
    return <div className="animate-pulse rounded-xs bg-grey-700 text-grey-700">15.00%</div>
  }

  if (isError) {
    return <div className="text-alert-warn">{t("Unable to fetch APY data")}</div>
  }

  return <span className={cn(apy ? "text-alert-success" : "text-body-secondary")}>{display}</span>
}

const EstimatedOutputValue: FC = () => {
  const { valueOut, tokenOut } = useSwapSell()

  return (
    <TokensAndFiat planck={valueOut} tokenId={tokenOut?.id} noCountUp tokensClassName="text-body" />
  )
}

const AlphaPriceValue = () => {
  const { swapPrice, taoToken } = useSwapSell()

  if (!taoToken) return null

  return (
    <TokensAndFiat
      planck={swapPrice!}
      tokenId={taoToken.id}
      className="text-body-secondary"
      tokensClassName="text-body"
      noCountUp
    />
  )
}

const PriceImpactValue = () => {
  const { priceImpact } = useSwapSell()

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

const SlippageToleranceValue = () => {
  const { slippage, netuid } = useSwapSell()
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
        containerId={CONTAINER_ID}
        netuid={netuid}
      />
    </>
  )
}

const MevShieldLabel = () => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <button type="button" className="whitespace-nowrap hover:text-body" onClick={open}>
        <div>
          {t("MEV Shield")} <InfoIcon className="inline" />
        </div>
      </button>
      <MevShieldInfoDrawer isOpen={isOpen} onDismiss={close} containerId={CONTAINER_ID} />
    </>
  )
}

const MevShieldValue = () => {
  const { withMevShield, isMevShieldDisabled, setIsMevProtectionEnabled } = useSwapSell()

  return (
    <Toggle
      variant="tiny"
      checked={withMevShield}
      disabled={isMevShieldDisabled}
      onChange={(e) => setIsMevProtectionEnabled(e.target.checked)}
    />
  )
}

const FeeEstimateValue = () => {
  const { feeEstimate, taoToken, isLoadingFeeEstimate, errorFeeEstimate } = useSwapSell()

  return (
    <StakingFeeEstimate
      plancks={feeEstimate}
      tokenId={taoToken?.id}
      isLoading={isLoadingFeeEstimate}
      error={errorFeeEstimate}
      noCountUp
    />
  )
}

const MAX_TOTAL_FEE_DISCOUNT = 1

const TalismanFeeLabel = () => {
  const { t } = useTranslation()
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")
  const { netuid } = useSwapSell()
  const { tier } = useGetSeekDiscount()
  const subnetFee = useGetSubnetFee({
    netuid: netuid ?? 0,
    direction: "taoToAlpha",
  })

  const subnetFeeDiscount = useMemo(() => {
    if (subnetFee === TALISMAN_FEE_BITTENSOR) {
      // No discount
      return 0
    } else if (subnetFee === 0) {
      // 100% discount
      return MAX_TOTAL_FEE_DISCOUNT
    } else {
      // Calculate discount percentage
      const discountDiff = TALISMAN_FEE_BITTENSOR - subnetFee
      return discountDiff / TALISMAN_FEE_BITTENSOR
    }
  }, [subnetFee])

  const totalFeeDiscount = useMemo(() => {
    if (subnetFeeDiscount === MAX_TOTAL_FEE_DISCOUNT) {
      // Discount cannot be greater than 100%
      return MAX_TOTAL_FEE_DISCOUNT
    } else if (isSeekTaoDiscountEnabled) {
      // Calculate total discount, combining subnet fee discount and seek discount
      return tier.discount + subnetFeeDiscount
    }
    // subnet fee discount only
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
        containerId={CONTAINER_ID}
      />
    </div>
  )
}

const TalismanFeeValue = () => {
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")
  const { talismanFee, taoToken, isLoading, errorFeeEstimate } = useSwapSell()

  const { tier } = useGetSeekDiscount()

  return (
    <StakingFeeEstimate
      plancks={talismanFee}
      tokenId={taoToken?.id}
      isLoading={isLoading}
      error={errorFeeEstimate}
      tokensClassName={tier.discount > 0 && isSeekTaoDiscountEnabled ? "text-[#D5FF5C]" : ""}
      noCountUp
      noFiat
    />
  )
}

const SendButton: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  const { payload, txMetadata, txInfo, canSubmit, withMevShield, onSubmit } = useSwapSell()

  const handleSubmit = useCallback(
    (hash: `0x${string}`, innerHash?: `0x${string}` | undefined) => {
      onSubmit(hash, innerHash)
      onClose()
    },
    [onSubmit, onClose]
  )

  return (
    <SapiSendButton
      containerId={CONTAINER_ID}
      label={t("Sell")}
      payload={payload}
      onSubmitted={handleSubmit}
      txMetadata={txMetadata}
      txInfo={txInfo}
      disabled={!canSubmit}
      mode={withMevShield ? "bittensor-mev-shield" : "default"}
    />
  )
}
