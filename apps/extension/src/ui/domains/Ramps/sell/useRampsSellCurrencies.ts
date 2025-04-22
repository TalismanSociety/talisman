import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useCoinbaseSellOptions } from "../coinbase/useCoinbaseSellOptions"
import { useRampCurrencies } from "../ramp/useRampCurrencies"
import { getRampsCurrency } from "../shared/currencies"

type CoinbaseSellCurrency = {
  id: string
  min: string
  max: string
}

const useCoinbaseSellCurrencies = () => {
  const { data: coinbaseSellOptions, ...rest } = useCoinbaseSellOptions()

  const data = useMemo(() => {
    if (coinbaseSellOptions === undefined) return undefined

    return coinbaseSellOptions.cashout_currencies
      .map((curr): CoinbaseSellCurrency | null => {
        const cardLimit = curr.limits.find((limit) => limit.id === "CRYPTO_ACCOUNT")
        return cardLimit ? { id: curr.id, min: cardLimit.min, max: cardLimit.max } : null
      })
      .filter(isNotNil)
  }, [coinbaseSellOptions])

  return { data, ...rest }
}

export const useRampsSellCurrencies = () => {
  const {
    data: rampCurrencies,
    isLoading: isLoadingOnRampCurrencies,
    error: errorOnRampCurrencies,
  } = useRampCurrencies()

  const {
    data: coinbaseCurrencies,
    isLoading: isLoadingCoinbaseCurrencies,
    error: errorCoinbaseCurrencies,
  } = useCoinbaseSellCurrencies()

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
    errors: errorOnRampCurrencies || errorCoinbaseCurrencies,
  }
}
