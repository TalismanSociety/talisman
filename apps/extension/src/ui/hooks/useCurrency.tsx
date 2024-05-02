import { TokenRateCurrency } from "@talismn/token-rates"
import { selectableCurrenciesAtom, selectedCurrencyAtom } from "@ui/atoms"
import { currencyOrder } from "@ui/domains/Asset/currencyConfig"
import { useAtomValue } from "jotai"
import { useAtomCallback } from "jotai/utils"
import { useCallback } from "react"

export const useSelectedCurrency = () => useAtomValue(selectedCurrencyAtom)

export const useToggleCurrency = () =>
  useAtomCallback(
    useCallback(async (get, set) => {
      const [selectableCurrencies, selectedCurrency] = await Promise.all([
        get(selectableCurrenciesAtom),
        get(selectedCurrencyAtom),
      ])

      /**
       * Always use the current `currencyOrder` to sort currencies.
       *
       * The order of `selectableCurrencies` is only updated when the user changes
       * which currencies they have selected.
       */
      const sortedCurrencies = selectableCurrencies.toSorted(sortCurrencies)

      const currIndex = sortedCurrencies.findIndex((c) => c === selectedCurrency)
      const nextIndex = (currIndex + 1) % sortedCurrencies.length
      const nextCurrency = sortedCurrencies.at(nextIndex) ?? sortedCurrencies[0]

      set(selectedCurrencyAtom, nextCurrency)
    }, [])
  )

const sortCurrencies = (a: TokenRateCurrency, b: TokenRateCurrency) => {
  const aIndex = currencyOrder.indexOf(a) ?? Number.MAX_SAFE_INTEGER
  const bIndex = currencyOrder.indexOf(b) ?? Number.MAX_SAFE_INTEGER

  return aIndex - bIndex
}
