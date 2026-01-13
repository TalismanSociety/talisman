import type { TokenRateCurrency } from "@talismn/token-rates"
import { useSetting } from "@ui/state"
import { type SetStateAction, useCallback } from "react"

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
