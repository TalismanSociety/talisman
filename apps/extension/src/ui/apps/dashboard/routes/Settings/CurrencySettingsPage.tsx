import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { StarIcon } from "@talismn/icons"
import { selectableCurrenciesAtom } from "@ui/atoms"
import { currencyConfig, currencyOrder } from "@ui/domains/Asset/currencyConfig"
import { useAtom } from "jotai"
import { useTranslation } from "react-i18next"

import { DashboardLayout } from "../../layout/DashboardLayout"

const CurrencySettingsPage = () => {
  const [selectableCurrencies, setSelectableCurrencies] = useAtom(selectableCurrenciesAtom)
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
              setSelectableCurrencies((selected) =>
                selected.includes(currency)
                  ? selected.filter((x) => x !== currency)
                  : [...selected, currency].sort(
                      (a, b) => currencyOrder.indexOf(a) - currencyOrder.indexOf(b)
                    )
              )
            }
          >
            <img className="w-16 max-w-full" alt={currency} src={currencyConfig[currency]?.icon} />
            <div className="flex grow flex-col items-start gap-1">
              <div className="text-body uppercase">{currency}</div>
              <div className="text-body-secondary text-xs">
                {currencyConfig[currency]?.unicodeCharacter ?? ""}{" "}
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
