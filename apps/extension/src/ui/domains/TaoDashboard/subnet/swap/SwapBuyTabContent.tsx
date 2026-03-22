import { Button } from "@ui/components/Button"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useBalances } from "@ui/state/balances"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { BittensorSlippageModal } from "./BittensorSlippageModal"
import { SwapBuyConfirmModal } from "./SwapBuyConfirmModal"
import { SwapBuyInput } from "./SwapBuyInput"
import { SwapBuyOutput } from "./SwapBuyOutput"
import { SwapBuyProvider, useSwapBuy } from "./SwapBuyProvider"
import {
  SwapDetailsRow,
  SwapFeeEstimate,
  SwapInputsContainer,
  SwapPriceImpact,
  SwapSlippageRow,
} from "./SwapTabShared"
import { useBittensorSlippageModal } from "./useBittensorSlippageModal"

export const SwapBuyTabContent: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapBuyProvider netuid={netuid}>
    <TabContent />
  </SwapBuyProvider>
)

const TabContent: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex w-full grow flex-col gap-10 overflow-hidden p-8">
        <SwapInputsContainer label={t("Spend")}>
          <SwapBuyInput />
        </SwapInputsContainer>
        <SwapInputsContainer label={t("Receive")} right={<StakedBalance />}>
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
        </div>
        <SubmitButton />
      </div>
      <BittensorSlippageModal />
    </div>
  )
}

const SubmitButton = () => {
  const { t } = useTranslation()
  const { canSubmit } = useSwapBuy()
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <Button
        fullWidth
        color="buy"
        onClick={open}
        disabled={!canSubmit}
        className="h-24 w-full rounded border-none text-black"
      >
        {t("Buy")}
      </Button>
      <SwapBuyConfirmModal isOpen={isOpen} onClose={close} />
    </>
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

const StakedBalance: FC = () => {
  const { t } = useTranslation()
  const { address, netuid, tokenOutGeneric } = useSwapBuy()
  const ownedBalances = useBalances("owned")

  const stakedPlanck = useMemo(() => {
    if (!address) return 0n
    return ownedBalances.each
      .filter(
        (b) =>
          b.address === address &&
          b.token?.type === "substrate-dtao" &&
          b.token.networkId === BITTENSOR_NETWORK_ID &&
          b.token.netuid === netuid &&
          b.free.planck > 0n
      )
      .reduce((sum, b) => sum + b.free.planck, 0n)
  }, [ownedBalances, address, netuid])

  if (!tokenOutGeneric) return null

  return (
    <div className="text-body-secondary text-sm">
      {t("Bal:")}{" "}
      <TokensAndFiat planck={stakedPlanck} tokenId={tokenOutGeneric.id} noCountUp noFiat />
    </div>
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
