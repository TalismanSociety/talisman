import { PlusIcon } from "@talismn/icons"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Dropdown, DropdownOptionRender } from "talisman-ui"

import { RampCurrency } from "../../types"
import { useBuyTokensWizard } from "../../useBuyTokensWizard"
import { currencyInfo } from "../../utils/currencyInfo"
import { InputWithSideComponent } from "../InputWithSideComponent"

export const BuyTokensFiatAmountInput = () => {
  const [fiatSearch, setFiatSearch] = useState<string>("")

  const { t } = useTranslation()
  const {
    buySellForm: { register, watch, setValue },
    setDebouncedFiatAmount,
    supportedRampCurrencies,
    isFiatAboveMinPurchaseAmount,
  } = useBuyTokensWizard()

  const [fiatCurrency, { minPurchaseAmount, symbol }] = watch(["fiatCurrency", "rampTokenAsset"])

  const handleFiatCurrencyChange = useMemo(
    () => (fiatCurrency: RampCurrency | null) => {
      const newFiatCurrency = fiatCurrency?.fiatCurrency ?? ""

      setValue("fiatCurrency", newFiatCurrency)
      setValue("rampTokenAsset.minPurchaseAmount", minPurchaseAmount ?? 0)
    },
    [minPurchaseAmount, setValue],
  )

  const selectedFiatCurrency = supportedRampCurrencies.find(
    (curr) => curr.fiatCurrency === fiatCurrency,
  )

  const handleFiatAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedFiatAmount(e.target.value)

    setValue("dirtyAmountField", "fiatAmount")
  }

  const renderFiatCurrencyItem: DropdownOptionRender<RampCurrency> = (item) => {
    const fiatCurrencyIfo = currencyInfo[item.fiatCurrency ?? ""]
    return (
      <div className="flex items-center gap-4">
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

  return (
    <InputWithSideComponent
      inputFieldProps={register("fiatAmount")}
      inputFieldLabel={fiatCurrency || "$0"}
      inputType="number"
      inputPlaceholder="0"
      onInputChange={(e) => {
        handleFiatAmountChange(e)
        register("fiatAmount").onChange(e)
      }}
      sideComponent={
        <Dropdown
          propertyKey="fiatCurrency"
          items={supportedRampCurrencies.filter((curr) =>
            curr.fiatCurrency.includes(fiatSearch.toUpperCase()),
          )}
          placeholder={
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-full bg-[#D5FF5C] bg-opacity-10">
                <PlusIcon className="text-primary-500 m-[0.3rem] size-10" />
              </div>
              <div className="text-xs text-white">{t("Select currency")}</div>
            </div>
          }
          value={selectedFiatCurrency}
          renderItem={renderFiatCurrencyItem}
          onChange={handleFiatCurrencyChange}
          className="rounded-[12px]"
          buttonClassName="px-3 py-3 h-full flex w-[16rem] gap-0"
          optionClassName="px-6 py-[8px] border-b border-grey-750"
          isSearchable
          handleSearchChange={setFiatSearch}
          searchPlaceholder={t("Search currency")}
          searchLabel={t(`Available now (${supportedRampCurrencies.length}):`)}
          onClear={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.stopPropagation()
            setValue("fiatCurrency", "", { shouldValidate: true })
          }}
        />
      }
      minStep="0.01"
      errorMessage={
        !isFiatAboveMinPurchaseAmount
          ? t(`The minimum purchase amount for ${symbol} is ${minPurchaseAmount} ${fiatCurrency}`)
          : ""
      }
    />
  )
}
