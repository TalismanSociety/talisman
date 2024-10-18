import { TokenRateCurrency } from "@talismn/token-rates"
import { SetStateAction, useCallback } from "react"

import { currencyOrder } from "@ui/domains/Asset/currencyConfig"
import { useSetting } from "@ui/state"

// TODO own file
export const useFavoriteCurrencies = () => {
  const [favorites, setFavoritesInner] = useSetting("selectableCurrencies")

  const setFavorites = useCallback(
    async (value: SetStateAction<TokenRateCurrency[]>) => {
      if (typeof value === "function") {
        const setter = value as (prev: TokenRateCurrency[]) => TokenRateCurrency[]
        value = setter(favorites)
      }
      await setFavoritesInner(value)
    },
    [setFavoritesInner, favorites]
  )

  return [favorites, setFavorites] as const
}

// TODO own file
export const useSelectedCurrency = () => {
  const [selected] = useSetting("selectedCurrency")
  return selected
}

const sortCurrencies = (a: TokenRateCurrency, b: TokenRateCurrency) => {
  const aIndex = currencyOrder.indexOf(a) ?? Number.MAX_SAFE_INTEGER
  const bIndex = currencyOrder.indexOf(b) ?? Number.MAX_SAFE_INTEGER

  return aIndex - bIndex
}

// TODO own file
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
