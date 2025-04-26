import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useCoinbaseSellOptions } from "./useCoinbaseSellOptions"

type CoinbaseSellCurrency = {
  id: string
  min: string
  max: string
}

export const useCoinbaseSellCurrencies = () => {
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
