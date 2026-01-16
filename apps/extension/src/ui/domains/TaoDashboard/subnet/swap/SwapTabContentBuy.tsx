import { subDTaoTokenId, subNativeTokenId } from "@talismn/chaindata-provider"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { SwapBuyInput } from "./SwapBuyInput"
import { SwapBuyProvider, useSwapBuy } from "./SwapBuyProvider"

const SwapTabContentBuyInner: FC = () => {
  const { netuid, address, value, maxValue, onAccountChange, onValueChange } = useSwapBuy()
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
        <div className="flex w-full flex-col gap-5 overflow-hidden">
          <div className="text-buy text-sm">{t("Spend")}</div>
          <SwapBuyInput
            address={address}
            tokenId={fromTokenId}
            value={value}
            maxValue={maxValue}
            onAccountChange={onAccountChange}
            onValueChange={onValueChange}
            onTokenChange={() => {}}
          />
        </div>

        <SwapBuyInput
          address=""
          tokenId={fromTokenId}
          value={0n}
          maxValue={0n}
          onAccountChange={() => {}}
          onValueChange={() => {}}
          onTokenChange={() => {}}
        />
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

export const SwapTabContentBuy: FC<{ netuid: number }> = ({ netuid }) => (
  <SwapBuyProvider netuid={netuid}>
    <SwapTabContentBuyInner />
  </SwapBuyProvider>
)
