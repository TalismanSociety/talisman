import { selectableCurrenciesState, selectedCurrencyState } from "@ui/atoms"
import { useRecoilCallback, useRecoilValue } from "recoil"

export const useSelectedCurrency = () => useRecoilValue(selectedCurrencyState)

export const useToggleCurrency = () =>
  useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const [selectableCurrencies, selectedCurrency] = await Promise.all([
          snapshot.getPromise(selectableCurrenciesState),
          snapshot.getPromise(selectedCurrencyState),
        ])

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
