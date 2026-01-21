import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { BittensorSlippageModal } from "./BittensorSlippageModal"
import { BITTENSOR_SWAP_CONTAINER_ID } from "./common"
import { SwapBuyInput } from "./SwapBuyInput"
import { SwapBuyOutput } from "./SwapBuyOutput"
import { SwapBuyProvider, useSwapBuy } from "./SwapBuyProvider"
import {
  SwapDetailsRow,
  SwapFeeEstimate,
  SwapInputsContainer,
  SwapMevShieldRow,
  SwapPriceImpact,
  SwapSlippageRow,
  SwapSubmitButton,
} from "./SwapTabShared"
import { useBittensorSlippageModal } from "./useBittensorSlippageModal"

export const SwapTabContentBuy: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapBuyProvider netuid={netuid}>
    <SwapTabContentBuyInner />
  </SwapBuyProvider>
)

const SwapTabContentBuyInner: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex w-full grow flex-col gap-10 overflow-hidden p-8">
        <SwapInputsContainer variant="buy" label={t("Spend")}>
          <SwapBuyInput />
        </SwapInputsContainer>
        <SwapInputsContainer variant="buy" label={t("Receive")}>
          <SwapBuyOutput />
        </SwapInputsContainer>
      </div>
      <div className="flex w-full flex-col gap-5 overflow-hidden border-black-tertiary border-t bg-[#202020] p-10 pt-5">
        <div className="flex w-full flex-col overflow-hidden">
          <SwapDetailsRow label={t("Estimated Fee")}>
            <FeeEstimate />
          </SwapDetailsRow>
          <SwapDetailsRow label={t("Price Impact")}>
            <PriceImpact />
          </SwapDetailsRow>
          <SwapDetailsRow label={t("Max Slippage")}>
            <SlippageEdit />
          </SwapDetailsRow>
          <MevShieldRow />
        </div>
        <SubmitButton />
      </div>
      <BittensorSlippageModal />
    </div>
  )
}

const MevShieldRow = () => {
  const { isMevShieldDisabled, withMevShield, setIsMevProtectionEnabled } = useSwapBuy()

  return (
    <SwapMevShieldRow
      withMevShield={withMevShield}
      isMevShieldDisabled={isMevShieldDisabled}
      setIsMevProtectionEnabled={setIsMevProtectionEnabled}
    />
  )
}

const SubmitButton = () => {
  const { t } = useTranslation()
  const { payload, txMetadata, txInfo, canSubmit, txMode, onSubmit } = useSwapBuy()

  return (
    <SwapSubmitButton
      containerId={BITTENSOR_SWAP_CONTAINER_ID}
      label={t("Buy")}
      color="buy"
      payload={payload}
      txMetadata={txMetadata}
      txInfo={txInfo}
      txMode={txMode}
      canSubmit={canSubmit}
      onSubmitted={onSubmit}
    />
  )
}

const PriceImpact = () => {
  const { priceImpact, isLoading } = useSwapBuy()

  return <SwapPriceImpact priceImpact={priceImpact} isLoading={isLoading} />
}

const FeeEstimate = () => {
  const { feeEstimate, isLoadingFeeEstimate, errorFeeEstimate, tokenIdIn } = useSwapBuy()

  return (
    <SwapFeeEstimate
      tokenId={tokenIdIn}
      feeEstimate={feeEstimate}
      isLoading={isLoadingFeeEstimate}
      error={errorFeeEstimate}
    />
  )
}

const SlippageEdit = () => {
  const { slippage, netuid } = useSwapBuy()
  const { open } = useBittensorSlippageModal()

  const handleClick = useCallback(() => {
    open({ netuid })
  }, [open, netuid])

  return <SwapSlippageRow slippage={slippage} onEdit={handleClick} />
}
