import { useMemo } from "react"

import { useCoinbaseSellTokens } from "../coinbase/useCoinbaseSellTokens"
import { useRampSellTokens } from "../ramp/useRampSellTokens"

export const useRampsSellTokens = (currency: string | undefined) => {
  const { tokens: coinbaseTokens = [], isLoading: isLoadingCoinbaseTokens } =
    useCoinbaseSellTokens()
  const { tokens: rampTokens = [], isLoading: isLoadingRampTokens } = useRampSellTokens(currency)

  const tokens = useMemo(() => {
    return Object.values(
      Object.assign(
        Object.fromEntries(coinbaseTokens.map((t) => [t.id, t])),
        Object.fromEntries(rampTokens.map((t) => [t.id, t])),
      ),
    )
  }, [coinbaseTokens, rampTokens])

  return {
    tokens,
    isLoading: isLoadingCoinbaseTokens || isLoadingRampTokens,
  }
}
