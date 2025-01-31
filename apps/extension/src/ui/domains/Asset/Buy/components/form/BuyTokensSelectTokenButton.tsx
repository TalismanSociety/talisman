import { useTranslation } from "react-i18next"

import { RampTokenAsset } from "../../types"
import { DEFAULT_RAMP_TOKEN_ASSET, useBuyTokensWizard } from "../../useBuyTokensWizard"
import { BuyTokensButton } from "./BuyTokensButton"

const RenderSelectedToken = ({ item }: { item: RampTokenAsset }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">
        <img src={item.logo} alt={item.symbol} className="h-[28px] w-[28px] rounded-full" />
      </div>
      <div className="min-w-0 text-left text-[16px]">
        <div className="text-md text-white">{item.symbol}</div>
        <div className="text-tiny truncate">{item.chainName}</div>
      </div>
    </div>
  )
}

export const BuyTokensSelectTokenButton = () => {
  const { t } = useTranslation()
  const {
    isRampNotSupported,
    setRoute,
    buySellForm: { watch, setValue },
  } = useBuyTokensWizard()

  const [rampTokenAsset] = watch(["rampTokenAsset"])

  const handleClear = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation()
    setValue("rampTokenAsset", DEFAULT_RAMP_TOKEN_ASSET, { shouldValidate: true })
  }

  return (
    <BuyTokensButton
      isDisabled={isRampNotSupported}
      onClick={() => setRoute("pickToken")}
      onClear={handleClear}
      shouldRenderSelected={!!rampTokenAsset.symbol}
      selectedItem={<RenderSelectedToken item={rampTokenAsset} />}
      label={t("Select token")}
    />
  )
}
