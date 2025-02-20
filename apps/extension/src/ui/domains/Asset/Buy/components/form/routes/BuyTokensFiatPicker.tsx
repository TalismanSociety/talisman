import { CheckCircleIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"

import { RampCurrency } from "../../../types"
import { useBuyTokensWizard } from "../../../useBuyTokensWizard"
import { currencyInfo } from "../../../utils/currencyInfo"
import { BuyTokensLayout } from "../../BuyTokensLayout"

export const BuyTokensFiatPicker = () => {
  const [filteredCurrency, setFilteredCurrency] = useState<RampCurrency[]>([])
  const { t } = useTranslation()

  const {
    buySellForm: { watch, setValue },
    supportedRampCurrencies,
    setRoute,
  } = useBuyTokensWizard()

  const [fiatCurrency, { minPurchaseAmount }] = watch(["fiatCurrency", "rampTokenAsset"])

  useEffect(() => {
    // selected currency first
    const sortedCurrencies = supportedRampCurrencies.sort((a, b) => {
      // Sort by selected currency
      if (a.fiatCurrency === fiatCurrency) return -1
      if (b.fiatCurrency === fiatCurrency) return 1
      // Then sort alphabetically
      return a.fiatCurrency.localeCompare(b.fiatCurrency)
    })

    setFilteredCurrency(sortedCurrencies)
  }, [fiatCurrency, supportedRampCurrencies])

  const handleSearch = useCallback(
    (value: string) => {
      const filteredCurrencies = supportedRampCurrencies.filter(
        (currency) =>
          !value ||
          currency.name.toLowerCase().includes(value.toLowerCase()) ||
          currency.fiatCurrency.toLowerCase().includes(value.toLowerCase()),
      )
      setFilteredCurrency(filteredCurrencies)
    },
    [supportedRampCurrencies],
  )

  const handleFiatCurrencySelect = useMemo(
    () => (fiatCurrency: RampCurrency | null) => {
      const newFiatCurrency = fiatCurrency?.fiatCurrency ?? ""

      setValue("fiatCurrency", newFiatCurrency, { shouldValidate: true })
      setValue("rampTokenAsset.minPurchaseAmount", minPurchaseAmount ?? 0, { shouldValidate: true })

      setRoute("mainForm")
    },
    [minPurchaseAmount, setRoute, setValue],
  )

  return (
    <BuyTokensLayout withBackLink title={t("Select currency")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput
            onChange={handleSearch}
            placeholder={t("Search by currency name or symbol")}
          />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          {filteredCurrency.map((item) => (
            <FiatCurrencyItem
              item={item}
              key={item.fiatCurrency}
              onClick={() => handleFiatCurrencySelect(item)}
              selected={fiatCurrency === item.fiatCurrency}
            />
          ))}
        </ScrollContainer>
      </div>
    </BuyTokensLayout>
  )
}

type FiatCurrencyItemProps = {
  item: RampCurrency
  onClick: () => void
  onClear?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  selected: boolean
  className?: string
}

export const FiatCurrencyItem = ({
  item,
  selected,
  className,
  onClick,
  onClear,
}: FiatCurrencyItemProps) => {
  const fiatCurrencyIfo = currencyInfo[item.fiatCurrency ?? ""]
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800 text-body-secondary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <img
            src={`https://assets.ramp.network/flags/${fiatCurrencyIfo.countryCode}.svg`}
            alt={item.fiatCurrency}
            className="h-[28px] w-[28px] rounded-full"
          />
        </div>
        <div className="min-w-0 text-[16px]">
          <div className="flex items-center">
            <div className="text-white">{item.fiatCurrency}</div>
            {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
          </div>
          <div className="text-tiny truncate">{item.name}</div>
        </div>
        {onClear && (
          <div onClick={onClear} role="button" tabIndex={0} onKeyDown={() => null}>
            <XIcon className="shrink-0 text-[1.2em]" />
          </div>
        )}
      </div>
    </button>
  )
}
