import { selectableCurrenciesState, selectedCurrencyState } from "@ui/atoms"
import { useRecoilCallback } from "recoil"

export const useToggleCurrency = () =>
  useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const selectableCurrencies = await snapshot.getPromise(selectableCurrenciesState)
        const selectedCurrency = await snapshot.getPromise(selectedCurrencyState)

        set(
          selectedCurrencyState,
          selectableCurrencies.at(
            selectableCurrencies.findIndex((x) => x === selectedCurrency) + 1
          ) ??
            selectableCurrencies[0] ??
            selectedCurrency
        )
      },
    []
  )
