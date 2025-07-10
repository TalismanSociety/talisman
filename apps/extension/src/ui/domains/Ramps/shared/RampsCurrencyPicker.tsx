import { Icon, loadIcons } from "@iconify/react"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { range } from "lodash-es"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useOpenCloseStatus } from "talisman-ui"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useFavoriteCurrencies } from "@ui/hooks/useFavoriteCurrencies"

import { RAMPS_CURRENCIES, RampsCurrency } from "./currencies"
import { RampsPickerLayout } from "./RampsPickerLayout"

export const RampsCurrencyPicker: FC<{
  selected?: string
  onSelect: (currencyCode: string) => void
  onClose: () => void
}> = ({ selected, onClose, onSelect }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const [favoriteCurrenciesRaw] = useFavoriteCurrencies()
  const favoriteCurrenciesUpper = useMemo(() => {
    // favorites are lower case
    // ramps currencies are upper case
    return favoriteCurrenciesRaw
      .map((c) => c.toUpperCase())
      .filter((fc) => RAMPS_CURRENCIES.find((rc) => rc.code === fc))
  }, [favoriteCurrenciesRaw])

  const sortedCurrencies = useMemo(
    () =>
      RAMPS_CURRENCIES.concat().sort((c1, c2) => {
        if (c1.code === selected) return -1
        if (c2.code === selected) return 1

        const isFav1 = favoriteCurrenciesUpper.includes(c1.code)
        const isFav2 = favoriteCurrenciesUpper.includes(c2.code)
        if (isFav1 && !isFav2) return -1
        if (!isFav1 && isFav2) return 1

        return c1.code.localeCompare(c2.code)
      }),
    [favoriteCurrenciesUpper, selected],
  )

  const filteredCurrencies = useMemo(() => {
    const ls = search.toLowerCase()
    return sortedCurrencies.filter(
      (currency) =>
        currency.code.toLowerCase().includes(ls) || currency.name.toLowerCase().includes(ls),
    )
  }, [sortedCurrencies, search])

  // preload icons
  const [isIconsReady, setIsIconsReady] = useState(false)
  useEffect(() => {
    loadIcons(
      RAMPS_CURRENCIES.map((c) => c.icon),
      () => {
        setIsIconsReady(true)
      },
    )
  }, [])

  // once drawer is open, focus on the search input
  const refSearchInput = useRef<HTMLInputElement>(null)
  const transitionStatus = useOpenCloseStatus()
  useEffect(() => {
    if (transitionStatus === "open") refSearchInput.current?.focus()
  }, [transitionStatus])

  return (
    <RampsPickerLayout onBackClick={onClose} title={t("Select a currency")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput ref={refSearchInput} onChange={setSearch} placeholder={t("Search")} />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          {!isIconsReady ? (
            range(0, 10).map((i) => <CurrencyButtonRowSkeleton key={i} />)
          ) : (
            <CurrenciesList
              currencies={filteredCurrencies}
              onSelect={onSelect}
              selected={selected}
            />
          )}
        </ScrollContainer>
      </div>
    </RampsPickerLayout>
  )
}

const CurrenciesList: FC<{
  currencies: RampsCurrency[]
  selected?: string
  onSelect: (currencyCode: string) => void
}> = ({ currencies, selected, onSelect }) => {
  const { t } = useTranslation()
  const { ref: refContainer } = useScrollContainer()

  const virtualizer = useVirtualizer({
    count: currencies.length,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!currencies.length)
    return (
      <div className="text-body-secondary p-12 text-center text-base">
        {t("No currencies match your search")}
      </div>
    )

  return (
    <div>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const currency = currencies[item.index]
          if (!currency) return null

          return (
            <div
              key={item.key}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <CurrencyButtonRow
                key={item.key}
                selected={currency.code === selected}
                currency={currency}
                onClick={() => onSelect(currency.code)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CurrencyButtonRow: FC<{
  currency: RampsCurrency
  onClick: () => void
  selected: boolean
}> = ({ currency, selected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800 text-body-secondary",
      )}
    >
      <div className="flex items-center gap-8">
        <div className="size-16 shrink-0">
          <Icon icon={currency.icon} className="size-16 shrink-0" />
        </div>
        <div className="min-w-0 text-[16px]">
          <div className="flex items-center">
            <div className="text-white">{currency.code}</div>
            {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
          </div>
          <div className="text-tiny truncate">{currency.name}</div>
        </div>
      </div>
    </button>
  )
}

const CurrencyButtonRowSkeleton: FC = () => {
  return (
    <div className="flex h-[5.8rem] w-full select-none items-center gap-4 px-12 text-left">
      <div className="flex items-center gap-8">
        <div className="flex-shrink-0">
          <div className="bg-grey-750 size-16 animate-pulse rounded-full"></div>
        </div>
        <div className="min-w-0 space-y-2 text-[16px]">
          <div className="flex items-center">
            <div className="bg-grey-750 text-grey-750 rounded-xs animate-pulse">XXX</div>
          </div>
          <div className="text-tiny bg-grey-750 text-grey-750 rounded-xs animate-pulse">
            XXXXXXXX XXXXXX
          </div>
        </div>
      </div>
    </div>
  )
}
