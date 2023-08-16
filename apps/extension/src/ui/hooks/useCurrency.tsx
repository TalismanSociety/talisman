import { selectableCurrenciesState, selectedCurrencyState } from "@ui/atoms"
import { useRecoilCallback } from "recoil"

export const useToggleCurrency = () =>
  useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const selectableCurrency = await snapshot.getPromise(selectableCurrenciesState)
        const selectedCurrency = await snapshot.getPromise(selectedCurrencyState)

        set(
          selectedCurrencyState,
          selectableCurrency.at(selectableCurrency.findIndex((x) => x === selectedCurrency) + 1) ??
            selectableCurrency[0] ??
            selectedCurrency
        )
      },
    []
  )
