import { useTranslation } from "react-i18next"

import { RampCurrency } from "../../types"
import { useBuyTokensWizard } from "../../useBuyTokensWizard"
import { currencyInfo } from "../../utils/currencyInfo"
import { BuyTokensButton } from "./BuyTokensButton"

const RenderFiatCurrencyItem = ({ item }: { item: RampCurrency | undefined }) => {
  if (!item) return
  const fiatCurrencyIfo = currencyInfo[item.fiatCurrency ?? ""]
  return (
    <div className="flex items-center gap-4 truncate text-left">
      <div className="flex-shrink-0">
        <img
          src={`https://assets.ramp.network/flags/${fiatCurrencyIfo.countryCode}.svg`}
          alt={item.fiatCurrency}
          className="h-[28px] w-[28px] rounded-full"
        />
      </div>
      <div className="min-w-0 text-[16px]">
        <div className="text-white">{item.fiatCurrency}</div>
        <div className="text-tiny truncate">{item.name}</div>
      </div>
    </div>
  )
}

export const BuyTokensSelectFiatButton = () => {
  const { t } = useTranslation()
  const {
    isRampNotSupported,
    buySellForm: { watch, setValue },
    setRoute,
    supportedRampCurrencies,
  } = useBuyTokensWizard()
  const [fiatCurrency] = watch(["fiatCurrency"])

  const selectedFiatCurrency = supportedRampCurrencies.find(
    (curr) => curr.fiatCurrency === fiatCurrency,
  )

  const handleClear = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation()
    setValue("fiatCurrency", "", { shouldValidate: true })
  }

  return (
    <BuyTokensButton
      isDisabled={isRampNotSupported}
      onClick={() => setRoute("pickFiat")}
      onClear={handleClear}
      shouldRenderSelected={!!fiatCurrency}
      selectedItem={<RenderFiatCurrencyItem item={selectedFiatCurrency} />}
      label={t("Select currency")}
    />
  )
}
