import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useCoinbaseBuyOptions } from "./useCoinbaseBuyOptions"

type CoinbaseBuyCurrency = {
  id: string
  min: string
  max: string
}

export const useCoinbaseBuyCurrencies = () => {
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
