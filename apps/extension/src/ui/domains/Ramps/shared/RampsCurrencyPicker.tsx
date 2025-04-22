import { Icon, loadIcons } from "@iconify/react"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { range } from "lodash"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useOpenCloseStatus } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"

import { RampsCurrencyInfo } from "./currencyInfo"
import { RampsLayout } from "./RampsLayout"

export const RampsCurrencyPicker: FC<{
  /** if undefined, component assumes currencies are loading */
  currencies: RampsCurrencyInfo[] | undefined
  selected?: string
  onSelect: (currencyCode: string) => void
  onClose: () => void
}> = ({ currencies, selected, onClose, onSelect }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const sortedCurrencies = useMemo(
    () =>
      currencies?.concat().sort((c1, c2) => {
        if (c1.code === selected) return -1
        if (c2.code === selected) return 1

        return c1.currencyName.localeCompare(c2.currencyName)
      }),
    [currencies, selected],
  )

  const filteredCurrencies = useMemo(() => {
    const ls = search.toLowerCase()
    return sortedCurrencies?.filter(
      (currency) =>
        currency.code.toLowerCase().includes(ls) ||
        currency.currencyName.toLowerCase().includes(ls),
    )
  }, [sortedCurrencies, search])

  // preload icons
  const [isIconsReady, setIsIconsReady] = useState(false)
  useEffect(() => {
    if (!currencies) return

    loadIcons(
      currencies.map((c) => c.icon),
      () => {
        setIsIconsReady(true)
      },
    )
  }, [currencies])

  // once drawer is open, focus on the search input
  const refSearchInput = useRef<HTMLInputElement>(null)
  const transitionStatus = useOpenCloseStatus()
  useEffect(() => {
    if (transitionStatus === "open") refSearchInput.current?.focus()
  }, [transitionStatus])

  return (
    <RampsLayout onBackClick={onClose} title={t("Select a currency")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput ref={refSearchInput} onChange={setSearch} placeholder={t("Search")} />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          {!isIconsReady || !filteredCurrencies
            ? range(0, 10).map((i) => <CurrencyButtonRowSkeleton key={i} />)
            : filteredCurrencies?.map((currency) => (
                <CurrencyButtonRow
                  currency={currency}
                  key={currency.code}
                  onClick={() => onSelect(currency.code)}
                  selected={selected === currency.code}
                />
              ))}
          {/* {isIconsReady &&
            filteredCurrencies?.map((currency) => (
              <CurrencyButtonRow
                currency={currency}
                key={currency.code}
                onClick={() => onSelect(currency.code)}
                selected={selected === currency.code}
              />
            ))} */}
        </ScrollContainer>
      </div>
    </RampsLayout>
  )
}

const CurrencyButtonRow: FC<{
  currency: RampsCurrencyInfo
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
          <div className="text-tiny truncate">{currency.currencyName}</div>
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
