import { Icon } from "@iconify/react"
import { CheckCircleIcon, XIcon } from "@talismn/icons"
import { classNames, isNotNil } from "@talismn/util"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"

import { getRampCurrencyInfo, RampCurrencyInfo } from "../../../../Ramp/currencyInfo"
import { BuyTokensLayout } from "../../BuyTokensLayout"

export const BuyTokensFiatPicker: FC<{
  currencyCodes: string[]
  selected?: string
  onSelect: (currencyCode: string) => void
}> = ({ currencyCodes, selected, onSelect }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const allCurrencies = useMemo(
    () => currencyCodes.concat().sort().map(getRampCurrencyInfo).filter(isNotNil),
    [currencyCodes],
  )

  const currencies = useMemo(() => {
    const ls = search.toLowerCase()
    return allCurrencies.filter(
      (currency) =>
        currency.code.toLowerCase().includes(ls) ||
        currency.currencyName.toLowerCase().includes(ls),
    )
  }, [allCurrencies, search])

  // const [filteredCurrency, setFilteredCurrency] = useState<RampCurrency[]>([])
  // const { t } = useTranslation()

  // const {
  //   buySellForm: { watch, setValue },
  //   supportedRampCurrencies,
  //   setRoute,
  // } = useBuyTokensWizard()

  // const [fiatCurrency, { minPurchaseAmount }] = watch(["fiatCurrency", "rampTokenAsset"])

  // useEffect(() => {
  //   // selected currency first
  //   const sortedCurrencies = supportedRampCurrencies.sort((a, b) => {
  //     // Sort by selected currency
  //     if (a.fiatCurrency === fiatCurrency) return -1
  //     if (b.fiatCurrency === fiatCurrency) return 1
  //     // Then sort alphabetically
  //     return a.fiatCurrency.localeCompare(b.fiatCurrency)
  //   })

  //   setFilteredCurrency(sortedCurrencies)
  // }, [fiatCurrency, supportedRampCurrencies])

  // const handleSearch = useCallback(
  //   (value: string) => {
  //     const filteredCurrencies = supportedRampCurrencies.filter(
  //       (currency) =>
  //         !value ||
  //         currency.name.toLowerCase().includes(value.toLowerCase()) ||
  //         currency.fiatCurrency.toLowerCase().includes(value.toLowerCase()),
  //     )
  //     setFilteredCurrency(filteredCurrencies)
  //   },
  //   [supportedRampCurrencies],
  // )

  // const handleFiatCurrencySelect = useMemo(
  //   () => (fiatCurrency: RampCurrency | null) => {
  //     const newFiatCurrency = fiatCurrency?.fiatCurrency ?? ""

  //     setValue("fiatCurrency", newFiatCurrency, { shouldValidate: true })
  //     setValue("rampTokenAsset.minPurchaseAmount", minPurchaseAmount ?? 0, { shouldValidate: true })

  //     setRoute("mainForm")
  //   },
  //   [minPurchaseAmount, setRoute, setValue],
  // )

  return (
    <BuyTokensLayout title={t("Select currency")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput onChange={setSearch} placeholder={t("Search by currency name or symbol")} />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          {currencies.map((currency) => (
            <CurrencyButtonRow
              currency={currency}
              key={currency.code}
              onClick={() => onSelect(currency.code)}
              selected={selected === currency.code}
            />
          ))}
        </ScrollContainer>
      </div>
    </BuyTokensLayout>
  )
}

const CurrencyButtonRow: FC<{
  currency: RampCurrencyInfo
  onClick: () => void
  onClear?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  selected: boolean
  className?: string
}> = ({ currency, selected, className, onClick, onClear }) => {
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
          <Icon icon={currency.icon} className="size-14" />
          {/* <img
            src={`https://assets.ramp.network/flags/${fiatCurrencyIfo.countryCode}.svg`}
            alt={item.fiatCurrency}
            className="h-[28px] w-[28px] rounded-full"
          /> */}
        </div>
        <div className="min-w-0 text-[16px]">
          <div className="flex items-center">
            <div className="text-white">{currency.code}</div>
            {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
          </div>
          <div className="text-tiny truncate">{currency.currencyName}</div>
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
