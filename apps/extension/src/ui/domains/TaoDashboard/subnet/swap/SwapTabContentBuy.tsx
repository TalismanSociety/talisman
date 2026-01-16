import { subDTaoTokenId, subNativeTokenId } from "@talismn/chaindata-provider"
import { type FC, type PropsWithChildren, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { SwapBuyInput } from "./SwapBuyInput"
import { SwapBuyOutput } from "./SwapBuyOutput"
import { SwapBuyProvider, useSwapBuy } from "./SwapBuyProvider"

const SwapTabContentBuyInner: FC = () => {
  const { netuid, address, value, maxValue, toTokenId, onAccountChange, onValueChange } =
    useSwapBuy()
  const { t } = useTranslation()
  const fromTokenId = useMemo(() => {
    return subNativeTokenId(BITTENSOR_NETWORK_ID)
  }, [])

  const _toTokenId = useMemo(() => {
    return subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid)
  }, [netuid])

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex w-full flex-col gap-10 overflow-hidden p-8">
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
      <div className="grow"></div>
      <div className="w-full p-10">
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

export const SwapTabContentBuy: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapBuyProvider netuid={netuid}>
    <SwapTabContentBuyInner />
  </SwapBuyProvider>
)
