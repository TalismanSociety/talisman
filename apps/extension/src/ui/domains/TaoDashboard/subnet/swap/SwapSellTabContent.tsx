import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, useOpenClose } from "talisman-ui"
import { SwapSellConfirmModal } from "./SwapSellConfirmModal"
import { SwapSellInput } from "./SwapSellInput"
import { SwapSellOutput } from "./SwapSellOutput"
import { SwapSellProvider, useSwapSell } from "./SwapSellProvider"
import {
  SwapDetailsRow,
  SwapFeeEstimate,
  SwapInputsContainer,
  SwapPriceImpact,
  SwapSlippageRow,
} from "./SwapTabShared"

export const SwapSellTabContent: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapSellProvider netuid={netuid}>
    <TabContent />
  </SwapSellProvider>
)

const TabContent: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex w-full grow flex-col gap-10 overflow-hidden p-8">
        <SwapInputsContainer label={t("Spend")}>
          <SwapSellInput />
        </SwapInputsContainer>
        <SwapInputsContainer label={t("Receive")}>
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
        </div>
        <SubmitButton />
      </div>
    </div>
  )
}

const SubmitButton = () => {
  const { t } = useTranslation()
  const { canSubmit } = useSwapSell()
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <Button
        fullWidth
        color="sell"
        onClick={open}
        disabled={!canSubmit}
        className="h-24 w-full rounded border-none text-black"
      >
        {t("Sell")}
      </Button>
      <SwapSellConfirmModal isOpen={isOpen} onClose={close} />
    </>
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
