import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useCoinbaseSellCurrencies } from "../coinbase/useCoinbaseSellCurrencies"
import { useRampCurrencies } from "../ramp/useRampCurrencies"
import { getRampsCurrency } from "../shared/currencies"

export const useRampsSellCurrencies = () => {
  const { data: rampCurrencies, isLoading: isLoadingOnRampCurrencies } = useRampCurrencies()
  const { data: coinbaseCurrencies, isLoading: isLoadingCoinbaseCurrencies } =
    useCoinbaseSellCurrencies()

  const currencies = useMemo(() => {
    if (isLoadingCoinbaseCurrencies || isLoadingOnRampCurrencies) return undefined
    return [
      ...new Set([
        ...(rampCurrencies?.filter((c) => c.offrampAvailable).map((c) => c.fiatCurrency) ?? []),
        ...(coinbaseCurrencies?.map((c) => c.id) ?? []),
      ]),
    ]
      .map(getRampsCurrency)
      .filter(isNotNil)
  }, [coinbaseCurrencies, isLoadingCoinbaseCurrencies, isLoadingOnRampCurrencies, rampCurrencies])

  return {
    currencies,
    isLoading: isLoadingOnRampCurrencies || isLoadingCoinbaseCurrencies,
  }
}
