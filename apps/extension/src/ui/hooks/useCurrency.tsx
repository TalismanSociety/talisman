import { selectableCurrenciesAtom, selectedCurrencyAtom } from "@ui/atoms"
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

      set(
        selectedCurrencyAtom,
        selectableCurrencies.at(
          selectableCurrencies.findIndex((x) => x === selectedCurrency) + 1
        ) ??
          selectableCurrencies[0] ??
          selectedCurrency
      )
    }, [])
  )
