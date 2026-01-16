import { EditIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { type FC, type PropsWithChildren, type ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Toggle } from "talisman-ui"
import { BittensorSlippageModal } from "./BittensorSlippageModal"
import { SwapBuyInput } from "./SwapBuyInput"
import { SwapBuyOutput } from "./SwapBuyOutput"
import { SwapBuyProvider, useSwapBuy } from "./SwapBuyProvider"
import { useBittensorSlippageModal } from "./useBittensorSlippageModal"

export const SwapTabContentBuy: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapBuyProvider netuid={netuid}>
    <SwapTabContentBuyInner />
  </SwapBuyProvider>
)

const SwapTabContentBuyInner: FC = () => {
  const { address, valueIn, maxValueIn, fromTokenId, priceImpact, onAccountChange, onValueChange } =
    useSwapBuy()
  const { t } = useTranslation()

  if (!fromTokenId) return null

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex w-full grow flex-col gap-10 overflow-hidden p-8">
        <InputsContainer label={t("Spend")}>
          <SwapBuyInput
            address={address}
            tokenId={fromTokenId}
            value={valueIn}
            maxValue={maxValueIn}
            onAccountChange={onAccountChange}
            onValueChange={onValueChange}
          />
        </InputsContainer>
        <InputsContainer label={t("Receive")}>
          <SwapBuyOutput />
        </InputsContainer>
      </div>
      <div className="flex w-full flex-col gap-5 overflow-hidden border-black-tertiary border-t bg-[#202020] p-10 pt-5">
        <div className="flex w-full flex-col overflow-hidden">
          <DetailsRow label={t("Estimated Fee")}>
            <FeeEstimate />
          </DetailsRow>
          <DetailsRow label={t("Price Impact")}>{priceImpact}</DetailsRow>
          <DetailsRow label={t("Max Slippage")}>
            <SlippageEdit />
          </DetailsRow>
          <div className="flex h-14 items-center justify-end text-body-secondary text-sm">
            <Toggle variant="sm">{t("Use MEV Shield")}</Toggle>
          </div>
        </div>
        <button
          type="button"
          className="h-24 w-full rounded border-none bg-buy font-bold text-black uppercase"
        >
          {t("Buy")}
        </button>
      </div>
      <BittensorSlippageModal />
    </div>
  )
}

const FeeEstimate = () => {
  const { t } = useTranslation()
  const { feeEstimate, isLoadingFeeEstimate, errorFeeEstimate, fromTokenId } = useSwapBuy()

  if (!fromTokenId) return null

  if (!feeEstimate && isLoadingFeeEstimate) {
    return (
      <div className="animate-pulse rounded-xs bg-body-disabled text-body-disabled">0.0022 TAO</div>
    )
  }

  if (errorFeeEstimate) {
    return <div className="text-alert-warn">{t("Failed to estimate fee")}</div>
  }

  if (feeEstimate === null) {
    return <div>{t("N/A")}</div>
  }

  return (
    <TokensAndFiat
      tokenId={fromTokenId}
      planck={feeEstimate}
      className={cn("text-body-secondary", isLoadingFeeEstimate && "animate-pulse")}
      tokensClassName="text-body"
    />
  )
}

const SlippageEdit = () => {
  const { slippage, netuid } = useSwapBuy()
  const { open } = useBittensorSlippageModal()

  const handleClick = useCallback(() => {
    open({ netuid })
  }, [open, netuid])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={"flex cursor-pointer items-center gap-2 rounded-xl pl-2 font-light text-xs"}
    >
      <EditIcon />
      <div>{slippage.toFixed(2)}%</div>
    </button>
  )
}

const InputsContainer: FC<PropsWithChildren<{ label: ReactNode }>> = ({ label, children }) => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className="pl-2 text-buy text-sm">{label}</div>
    <div>{children}</div>
  </div>
)

const DetailsRow: FC<PropsWithChildren<{ label: ReactNode }>> = ({ label, children }) => (
  <div className="flex h-14 w-full items-center justify-between text-sm">
    <div className="text-body-secondary">{label}</div>
    <div className="font-medium">{children}</div>
  </div>
)
