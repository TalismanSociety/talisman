import { isNotNil } from "@talismn/util"
import { log } from "extension-shared"
import { useMemo } from "react"

import { useCoinbaseBuyOptions } from "../coinbase/useCoinbaseBuyOptions"
import { useRampCurrencies } from "../ramp/useRampCurrencies"
import { getRampsCurrency } from "../shared/currencies"

type CoinbaseBuyCurrency = {
  id: string
  min: string
  max: string
}

const useBuyCoinbaseCurrencies = () => {
  const { data: coinbaseBuyOptions, ...rest } = useCoinbaseBuyOptions()

  const data = useMemo(() => {
    if (coinbaseBuyOptions === undefined) return undefined

    return coinbaseBuyOptions.payment_currencies
      .map((curr): CoinbaseBuyCurrency | null => {
        const cardLimit = curr.limits.find((limit) => limit.id === "CARD")
        return cardLimit ? { id: curr.id, min: cardLimit.min, max: cardLimit.max } : null
      })
      .filter(isNotNil)
  }, [coinbaseBuyOptions])

  return { data, ...rest }
}

export const useRampsBuyCurrencies = () => {
  const {
    data: rampCurrencies,
    isLoading: isLoadingOnRampCurrencies,
    error: errorOnRampCurrencies,
  } = useRampCurrencies()

  const {
    data: coinbaseCurrencies,
    isLoading: isLoadingCoinbaseCurrencies,
    error: errorCoinbaseCurrencies,
  } = useBuyCoinbaseCurrencies()

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
    errors: errorOnRampCurrencies || errorCoinbaseCurrencies,
  }
}
