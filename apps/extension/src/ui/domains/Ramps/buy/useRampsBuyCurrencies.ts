import { isNotNil } from "@talismn/util"
import { log } from "extension-shared"
import { useMemo } from "react"

import { useCoinbaseBuyCurrencies } from "../coinbase/useCoinbaseBuyCurrencies"
import { useRampCurrencies } from "../ramp/useRampCurrencies"
import { getRampsCurrency } from "../shared/currencies"

export const useRampsBuyCurrencies = () => {
  const { data: rampCurrencies, isLoading: isLoadingOnRampCurrencies } = useRampCurrencies()

  const { data: coinbaseCurrencies, isLoading: isLoadingCoinbaseCurrencies } =
    useCoinbaseBuyCurrencies()

  const currencies = useMemo(() => {
    if (isLoadingCoinbaseCurrencies || isLoadingOnRampCurrencies) return undefined
    return [
      ...new Set([
        ...(rampCurrencies?.filter((c) => c.onrampAvailable).map((c) => c.fiatCurrency) ?? []),
        ...(coinbaseCurrencies?.map((c) => c.id) ?? []),
      ]),
    ]
      .map((code) => {
        const currency = getRampsCurrency(code)
        // @dev: if this warning appears, add an entry to RAMPS_CURRENCIES_MAP
        if (!currency) log.warn("[ramps] Missing currency", code)
        return currency
      })
      .filter(isNotNil)
  }, [coinbaseCurrencies, isLoadingCoinbaseCurrencies, isLoadingOnRampCurrencies, rampCurrencies])

  return {
    currencies,
    isLoading: isLoadingOnRampCurrencies || isLoadingCoinbaseCurrencies,
  }
}
