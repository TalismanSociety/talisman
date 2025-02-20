import { ChevronLeftIcon, StarIcon } from "@talismn/icons"
import { TokenRateCurrency } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, IconButton } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { currencyConfig, currencyOrder, sortCurrencies } from "@ui/domains/Asset/currencyConfig"
import { useFavoriteCurrencies } from "@ui/hooks/useFavoriteCurrencies"
import { useSetting } from "@ui/state"

export const useCurrenciesDrawerOpenClose = () => useGlobalOpenClose("currencies-drawer")

const CurrencyButton: FC<{
  currency: TokenRateCurrency
  selected: boolean
  onClick: () => void
}> = ({ currency, selected, onClick }) => {
  return (
    <button
      type="button"
      className={classNames(
        "text-body-secondary flex h-28 w-full items-center gap-4 rounded-sm px-6",
        "border-grey-800 border",
        selected && "bg-grey-900",
        "hover:border-grey-700 hover:bg-grey-800 stroke-primary",
      )}
      onClick={onClick}
    >
      <img className="w-16 max-w-full" alt={currency} src={currencyConfig[currency]?.icon} />
      <div className="flex grow flex-col items-start gap-1">
        <div className="text-body text-base uppercase">{currency}</div>
        <div className="text-xs">
          {currencyConfig[currency]?.symbol ?? ""} {currencyConfig[currency]?.name ?? currency}
        </div>
      </div>
      {selected ? (
        <StarIcon className="stroke-primary fill-primary size-8" />
      ) : (
        <StarIcon className="size-8" />
      )}
    </button>
  )
}

const CurrenciesList = () => {
  const [favorites, setFavorites] = useFavoriteCurrencies()
  const [, setSelected] = useSetting("selectedCurrency")

  const handleCurrencyClick = useCallback(
    (currency: TokenRateCurrency) => () => {
      setFavorites((selectable) => {
        const newSelectable = selectable.includes(currency)
          ? selectable.filter((x) => x !== currency)
          : selectable.concat(currency).sort(sortCurrencies)

        if (!newSelectable.length) return selectable

        // NOTE: This makes sure that the `selectedCurrency` is always in the list of `selectableCurrencies`
        setSelected((selected) =>
          newSelectable.length === 0 || newSelectable.includes(selected)
            ? selected
            : newSelectable[0],
        )

        return newSelectable
      })
    },

    [setFavorites, setSelected],
  )

  return (
    <div className="flex flex-col gap-4">
      {currencyOrder.map((currency) => (
        <CurrencyButton
          key={currency}
          currency={currency}
          selected={favorites.includes(currency)}
          onClick={handleCurrencyClick(currency)}
        />
      ))}
    </div>
  )
}

const CurrenciesDrawerContent = () => {
  const { t } = useTranslation()
  const { close } = useCurrenciesDrawerOpenClose()

  return (
    <div className="text-body-secondary flex h-[60rem] w-[40rem] flex-col gap-10 bg-black pt-10">
      <div className="flex items-center gap-3 px-8 text-base font-bold text-white">
        <IconButton onClick={close}>
          <ChevronLeftIcon />
        </IconButton>
        <div>{t("Currency")}</div>
      </div>
      <div className="px-8">
        <p className="text-xs">
          {t(
            "Choose your favorite currencies. You can toggle between your favorite currencies directly from your portfolio.",
          )}
        </p>
      </div>
      <ScrollContainer className="grow" innerClassName="px-8 pb-8">
        <CurrenciesList />
      </ScrollContainer>
    </div>
  )
}

export const CurrenciesDrawer = () => {
  const { isOpen } = useCurrenciesDrawerOpenClose()

  return (
    <Drawer anchor="right" isOpen={isOpen} containerId="main">
      <CurrenciesDrawerContent />
    </Drawer>
  )
}
