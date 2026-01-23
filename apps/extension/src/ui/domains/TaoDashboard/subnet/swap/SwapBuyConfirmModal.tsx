import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { Modal, WizardModalDialog } from "talisman-ui"
import { useSwapBuy } from "./SwapBuyProvider"
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
  SwapConfirmValidatorApyLabel,
  SwapConfirmValidatorApyValue,
} from "./SwapConfirmShared"

const CONTAINER_ID = "tao-swap-confirm-modal"

export const SwapBuyConfirmModal: FC<{ isOpen: boolean; onClose: () => void }> = ({
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
        title={t("Confirm Buy")}
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
                <SwapConfirmFieldRow label={<SwapConfirmValidatorApyLabel />}>
                  <ValidatorApyValue />
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
  const { tokenIdIn, valueIn } = useSwapBuy()

  return <SwapConfirmAmountInValue tokenId={tokenIdIn ?? undefined} valueIn={valueIn} />
}

const SpenderValue = () => {
  const { address } = useSwapBuy()

  if (!address) return null

  return <AccountDisplay ss58Format={42} address={address} iconClassName="text-[2rem]" />
}

const SubnetValue = () => {
  const { t } = useTranslation()
  const { netuid, tokenOutGeneric } = useSwapBuy()

  return tokenOutGeneric?.subnetName || t("Subnet {{netuid}}", { netuid })
}

const ValidatorValue = () => {
  const { hotkey } = useSwapBuy()

  return <BittensorValidatorName hotkey={hotkey} />
}

const ValidatorApyValue = () => {
  const { hotkey, netuid } = useSwapBuy()

  return <SwapConfirmValidatorApyValue hotkey={hotkey ?? undefined} netuid={netuid} />
}

const EstimatedOutputValue: FC = () => {
  const { valueOut, tokenOutGeneric } = useSwapBuy()

  return <SwapConfirmEstimatedOutputValue valueOut={valueOut} tokenId={tokenOutGeneric?.id} />
}

const AlphaPriceValue = () => {
  const { swapPrice, taoToken } = useSwapBuy()

  return <SwapConfirmAlphaPriceValue swapPrice={swapPrice} tokenId={taoToken?.id} />
}

const PriceImpactValue = () => {
  const { priceImpact } = useSwapBuy()

  return <SwapConfirmPriceImpactValue priceImpact={priceImpact ?? undefined} />
}

const SlippageToleranceValue = () => {
  const { slippage, netuid } = useSwapBuy()

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
  const { withMevShield, isMevShieldDisabled, setIsMevProtectionEnabled } = useSwapBuy()

  return (
    <SwapConfirmMevShieldValue
      withMevShield={withMevShield}
      isMevShieldDisabled={isMevShieldDisabled}
      setIsMevProtectionEnabled={setIsMevProtectionEnabled}
    />
  )
}

const FeeEstimateValue = () => {
  const { feeEstimate, taoToken, isLoadingFeeEstimate, errorFeeEstimate } = useSwapBuy()

  return (
    <SwapConfirmFeeEstimateValue
      feeEstimate={feeEstimate ?? undefined}
      tokenId={taoToken?.id}
      isLoading={isLoadingFeeEstimate}
      error={errorFeeEstimate}
    />
  )
}

const TalismanFeeLabel = () => {
  const { netuid } = useSwapBuy()
  return <SwapConfirmTalismanFeeLabel netuid={netuid} containerId={CONTAINER_ID} />
}

const TalismanFeeValue = () => {
  const { talismanFee, taoToken, isLoading, errorFeeEstimate } = useSwapBuy()

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
  const { payload, txMetadata, txInfo, txMode, canSubmit, onSubmit } = useSwapBuy()

  return (
    <SwapConfirmSendButton
      containerId={CONTAINER_ID}
      label={t("Buy")}
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
