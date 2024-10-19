import { TokenRateCurrency } from "@talismn/token-rates"
import { useCallback } from "react"

import { currencyOrder } from "@ui/domains/Asset/currencyConfig"
import { useSetting } from "@ui/state"

import { useFavoriteCurrencies } from "./useFavoriteCurrencies"

const sortCurrencies = (a: TokenRateCurrency, b: TokenRateCurrency) => {
  const aIndex = currencyOrder.indexOf(a) ?? Number.MAX_SAFE_INTEGER
  const bIndex = currencyOrder.indexOf(b) ?? Number.MAX_SAFE_INTEGER

  return aIndex - bIndex
}

export const useToggleCurrency = () => {
  const [favorites] = useFavoriteCurrencies()
  const [selected, setSelected] = useSetting("selectedCurrency")

  return useCallback(async () => {
    const sortedCurrencies = favorites.concat().sort(sortCurrencies)

    const currIndex = sortedCurrencies.findIndex((c) => c === selected)
    const nextIndex = (currIndex + 1) % sortedCurrencies.length
    const nextCurrency = sortedCurrencies.at(nextIndex) ?? sortedCurrencies[0]

    setSelected(nextCurrency)
  }, [favorites, selected, setSelected])
}
