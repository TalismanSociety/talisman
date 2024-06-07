import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { StarIcon } from "@talismn/icons"
import { selectableCurrenciesAtom, selectedCurrencyAtom } from "@ui/atoms"
import { currencyConfig, currencyOrder, sortCurrencies } from "@ui/domains/Asset/currencyConfig"
import { useAtom, useSetAtom } from "jotai"
import { useTranslation } from "react-i18next"

import { DashboardLayout } from "../../layout/DashboardLayout"

const CurrencySettingsPage = () => {
  const [selectableCurrencies, setSelectableCurrencies] = useAtom(selectableCurrenciesAtom)
  const setSelectedCurrency = useSetAtom(selectedCurrencyAtom)
  const { t } = useTranslation()

  return (
    <DashboardLayout centered withBack backTo="/settings">
      <HeaderBlock
        title={t("Currency")}
        text={t(
          "Choose your preferred currency. You can toggle between the currencies you’ve selected directly from your portfolio."
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
              setSelectableCurrencies((selectable) => {
                const newSelectable = selectable.includes(currency)
                  ? selectable.filter((x) => x !== currency)
                  : selectable.concat(currency).sort(sortCurrencies)

                // NOTE: This makes sure that the `selectedCurrency` is always in the list of `selectableCurrencies`
                setSelectedCurrency((selected) =>
                  newSelectable.length === 0 || newSelectable.includes(selected)
                    ? selected
                    : newSelectable[0]
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
            {selectableCurrencies.includes(currency) ? (
              <StarIcon className="stroke-primary fill-primary" />
            ) : (
              <StarIcon />
            )}
          </button>
        ))}
      </div>
    </DashboardLayout>
  )
}

export default CurrencySettingsPage
