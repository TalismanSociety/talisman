import type { FC, PropsWithChildren, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Toggle } from "talisman-ui"
import { SwapBuyInput } from "./SwapBuyInput"
import { SwapBuyOutput } from "./SwapBuyOutput"
import { SwapBuyProvider, useSwapBuy } from "./SwapBuyProvider"

export const SwapTabContentBuy: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapBuyProvider netuid={netuid}>
    <SwapTabContentBuyInner />
  </SwapBuyProvider>
)

const SwapTabContentBuyInner: FC = () => {
  const { address, value, maxValue, fromTokenId, toTokenId, onAccountChange, onValueChange } =
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
            value={value}
            maxValue={maxValue}
            onAccountChange={onAccountChange}
            onValueChange={onValueChange}
            onTokenChange={() => {}}
          />
        </InputsContainer>
        <InputsContainer label={t("Receive")}>
          <SwapBuyOutput tokenId={toTokenId} value={null} />
        </InputsContainer>
      </div>
      <div className="flex w-full flex-col gap-5 overflow-hidden border-black-tertiary border-t bg-[#202020] p-10 pt-5">
        <div className="flex w-full flex-col overflow-hidden">
          <DetailsRow label={t("Estimated Fee")}>TODO</DetailsRow>
          <DetailsRow label={t("Price Impact")}>TODO</DetailsRow>
          <DetailsRow label={t("Max Slippage")}>TODO</DetailsRow>
          <div className="flex h-14 items-center justify-end text-body-secondary text-sm">
            <Toggle variant="sm">Use MEV Shield</Toggle>
          </div>
        </div>
        <button
          type="button"
          className="h-24 w-full rounded border-none bg-buy font-bold text-black uppercase"
        >
          {t("Buy")}
        </button>
      </div>
    </div>
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
