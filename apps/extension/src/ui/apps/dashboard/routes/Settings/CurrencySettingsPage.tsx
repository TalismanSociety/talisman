import { StarIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { currencyConfig, currencyOrder, sortCurrencies } from "@ui/domains/Asset/currencyConfig"
import { useFavoriteCurrencies } from "@ui/hooks/useFavoriteCurrencies"
import { useSetting } from "@ui/state"

import { DashboardLayout } from "../../layout"

const Content = () => {
  const [favorites, setFavorites] = useFavoriteCurrencies()
  const [, setSelected] = useSetting("selectedCurrency")
  const { t } = useTranslation()

  return (
    <>
      <HeaderBlock
        title={t("Currency")}
        text={t(
          "Choose your preferred currency. You can toggle between the currencies you’ve selected directly from your portfolio.",
        )}
      />
      <Spacer />
      <div className="flex flex-col gap-4">
        {currencyOrder.map((currency) => (
          <button
            type="button"
            key={currency}
            className="bg-grey-850 enabled:hover:bg-grey-800 text-body-disabled enabled:hover:text-body-secondary flex h-28 w-full cursor-pointer items-center gap-8 rounded-sm px-8 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() =>
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
            }
          >
            <img className="w-16 max-w-full" alt={currency} src={currencyConfig[currency]?.icon} />
            <div className="flex grow flex-col items-start gap-1">
              <div className="text-body uppercase">{currency}</div>
              <div className="text-body-secondary text-xs">
                {currencyConfig[currency]?.symbol ?? ""}{" "}
                {currencyConfig[currency]?.name ?? currency}
              </div>
            </div>
            {favorites.includes(currency) ? (
              <StarIcon className="stroke-primary fill-primary" />
            ) : (
              <StarIcon />
            )}
          </button>
        ))}
      </div>
    </>
  )
}

export const CurrencySettingsPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
