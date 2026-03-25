import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import {
  SwapConfirmAlphaPriceValue,
  SwapConfirmAmountInValue,
  SwapConfirmContainer,
  SwapConfirmEstimatedOutputValue,
  SwapConfirmFeeEstimateValue,
  SwapConfirmFieldRow,
  SwapConfirmFieldSeparator,
  SwapConfirmMevShieldLabel,
  SwapConfirmMevShieldValue,
  SwapConfirmPriceImpactValue,
  SwapConfirmSendButton,
  SwapConfirmSlippageToleranceValue,
  SwapConfirmTalismanFeeLabel,
  SwapConfirmTalismanFeeValue,
} from "./SwapConfirmShared"
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
            <SwapConfirmContainer>
              <div className="flex flex-col">
                <SwapConfirmFieldRow label={t("Amount")} variant="large">
                  <AmountInValue />
                </SwapConfirmFieldRow>
                <SwapConfirmFieldRow label={t("Account")} variant="large">
                  <SpenderValue />
                </SwapConfirmFieldRow>
                <SwapConfirmFieldSeparator className="py-4" />
                <SwapConfirmFieldRow label={t("Subnet")}>
                  <SubnetValue />
                </SwapConfirmFieldRow>
                <SwapConfirmFieldRow label={t("Validator")}>
                  <ValidatorValue />
                </SwapConfirmFieldRow>
              </div>
              <SwapConfirmFieldRow label={t("Estimated amount")}>
                <EstimatedOutputValue />
              </SwapConfirmFieldRow>
            </SwapConfirmContainer>
            <SwapConfirmContainer>
              <SwapConfirmFieldRow label={t("Alpha Price")}>
                <AlphaPriceValue />
              </SwapConfirmFieldRow>
              <SwapConfirmFieldRow label={t("Price Impact")}>
                <PriceImpactValue />
              </SwapConfirmFieldRow>
              <SwapConfirmFieldRow label={t("Slippage Tolerance")}>
                <SlippageToleranceValue />
              </SwapConfirmFieldRow>
              <SwapConfirmFieldRow label={<MevShieldLabel />}>
                <MevShieldValue />
              </SwapConfirmFieldRow>
            </SwapConfirmContainer>
            <SwapConfirmContainer>
              <SwapConfirmFieldRow label={t("Estimated Fee")}>
                <FeeEstimateValue />
              </SwapConfirmFieldRow>
              <SwapConfirmFieldRow label={<TalismanFeeLabel />}>
                <TalismanFeeValue />
              </SwapConfirmFieldRow>
            </SwapConfirmContainer>
          </div>
          <SendButton onClose={onClose} />
        </div>
      </WizardModalDialog>
    </PopupSizeModalContainer>
  )
}

const AmountInValue = () => {
  const { tokenIdIn, valueIn } = useSwapSell()

  return <SwapConfirmAmountInValue tokenId={tokenIdIn ?? undefined} valueIn={valueIn} />
}

const SpenderValue = () => {
  const { selectedPosition } = useSwapSell()

  if (!selectedPosition) return null

  return (
    <AccountDisplay
      ss58Format={42}
      address={selectedPosition.account.address}
      iconClassName="text-[1.25rem]"
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

const EstimatedOutputValue: FC = () => {
  const { valueOut, tokenOut } = useSwapSell()

  return <SwapConfirmEstimatedOutputValue valueOut={valueOut} tokenId={tokenOut?.id} />
}

const AlphaPriceValue = () => {
  const { swapPrice, taoToken } = useSwapSell()

  return <SwapConfirmAlphaPriceValue swapPrice={swapPrice} tokenId={taoToken?.id} />
}

const PriceImpactValue = () => {
  const { priceImpact } = useSwapSell()

  return <SwapConfirmPriceImpactValue priceImpact={priceImpact ?? undefined} />
}

const SlippageToleranceValue = () => {
  const { slippage, netuid } = useSwapSell()

  return (
    <SwapConfirmSlippageToleranceValue
      slippage={slippage}
      netuid={netuid}
      containerId={CONTAINER_ID}
    />
  )
}

const MevShieldLabel = () => {
  return <SwapConfirmMevShieldLabel containerId={CONTAINER_ID} />
}

const MevShieldValue = () => {
  const {
    withMevShield,
    isMevShieldDisabled,
    isMevShieldFeatureDisabled,
    setIsMevProtectionEnabled,
  } = useSwapSell()

  return (
    <SwapConfirmMevShieldValue
      withMevShield={withMevShield}
      isMevShieldDisabled={isMevShieldDisabled}
      isMevShieldFeatureDisabled={isMevShieldFeatureDisabled}
      setIsMevProtectionEnabled={setIsMevProtectionEnabled}
    />
  )
}

const FeeEstimateValue = () => {
  const {
    feeEstimate,
    innerFeeEstimate,
    mevShieldFeeEstimate,
    withMevShield,
    taoToken,
    isLoadingFeeEstimate,
    errorFeeEstimate,
  } = useSwapSell()

  return (
    <SwapConfirmFeeEstimateValue
      feeEstimate={feeEstimate ?? undefined}
      tokenId={taoToken?.id}
      isLoading={isLoadingFeeEstimate}
      error={errorFeeEstimate}
      withMevShield={withMevShield}
      innerFeeEstimate={innerFeeEstimate}
      mevShieldFeeEstimate={mevShieldFeeEstimate}
    />
  )
}

const TalismanFeeLabel = () => {
  const { netuid } = useSwapSell()
  return (
    <SwapConfirmTalismanFeeLabel
      netuid={netuid}
      containerId={CONTAINER_ID}
      direction="alphaToTao"
    />
  )
}

const TalismanFeeValue = () => {
  const { talismanFee, taoToken, isLoading, errorFeeEstimate } = useSwapSell()

  return (
    <SwapConfirmTalismanFeeValue
      talismanFee={talismanFee ?? undefined}
      tokenId={taoToken?.id}
      isLoading={isLoading}
      error={errorFeeEstimate}
    />
  )
}

const SendButton: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  const { payload, txMetadata, txInfo, canSubmit, txMode, onSubmit } = useSwapSell()

  return (
    <SwapConfirmSendButton
      containerId={CONTAINER_ID}
      label={t("Sell")}
      payload={payload}
      txMetadata={txMetadata}
      txInfo={txInfo}
      canSubmit={canSubmit}
      txMode={txMode}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  )
}
