import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"
import { BITTENSOR_SWAP_CONTAINER_ID } from "./common"
import { SwapSellInput } from "./SwapSellInput"
import { SwapSellOutput } from "./SwapSellOutput"
import { SwapSellProvider, useSwapSell } from "./SwapSellProvider"
import {
  SwapDetailsRow,
  SwapFeeEstimate,
  SwapInputsContainer,
  SwapMevShieldRow,
  SwapPriceImpact,
  SwapSlippageRow,
} from "./SwapTabShared"

export const SwapTabContentSell: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapSellProvider netuid={netuid}>
    <SwapTabContentSellInner />
  </SwapSellProvider>
)

const SwapTabContentSellInner: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex w-full grow flex-col gap-10 overflow-hidden p-8">
        <SwapInputsContainer variant="sell" label={t("Spend")}>
          <SwapSellInput />
        </SwapInputsContainer>
        <SwapInputsContainer variant="sell" label={t("Receive")}>
          <SwapSellOutput />
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
            <SlippageDisplay />
          </SwapDetailsRow>
          <MevShieldRow />
        </div>
        <SubmitButton />
      </div>
    </div>
  )
}

const SubmitButton = () => {
  const { t } = useTranslation()
  const { payload, txMetadata, txInfo, canSubmit, txMode, onSubmit } = useSwapSell()

  if (!payload) {
    return (
      <Button
        type="button"
        disabled
        className="h-24 w-full rounded border-none font-bold text-black uppercase"
        color="sell"
      >
        {t("Sell")}
      </Button>
    )
  }

  return (
    <SapiSendButton
      containerId={BITTENSOR_SWAP_CONTAINER_ID}
      className="h-24 w-full rounded border-none font-bold text-black uppercase"
      payload={payload}
      txMetadata={txMetadata}
      txInfo={txInfo}
      mode={txMode}
      color="sell"
      label={t("Sell")}
      disabled={!canSubmit}
      onSubmitted={onSubmit}
    />
  )
}

const MevShieldRow = () => {
  const { isMevShieldDisabled, withMevShield, setIsMevProtectionEnabled } = useSwapSell()

  return (
    <SwapMevShieldRow
      withMevShield={withMevShield}
      isMevShieldDisabled={isMevShieldDisabled}
      setIsMevProtectionEnabled={setIsMevProtectionEnabled}
    />
  )
}

const PriceImpact = () => {
  const { priceImpact, isLoading } = useSwapSell()

  return <SwapPriceImpact priceImpact={priceImpact} isLoading={isLoading} />
}

const FeeEstimate = () => {
  const { feeEstimate, isLoadingFeeEstimate, errorFeeEstimate, tokenIdOut } = useSwapSell()

  return (
    <SwapFeeEstimate
      tokenId={tokenIdOut}
      feeEstimate={feeEstimate}
      isLoading={isLoadingFeeEstimate}
      error={errorFeeEstimate}
    />
  )
}

const SlippageDisplay = () => {
  const { slippage } = useSwapSell()

  return <SwapSlippageRow slippage={slippage} />
}
