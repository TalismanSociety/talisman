import { useMemo } from "react"

import { useCoinbaseBuyTokens } from "../coinbase/useCoinbaseBuyTokens"
import { useRampBuyTokens } from "../ramp/useRampBuyTokens"

export const useRampsBuyTokens = (currency: string | undefined) => {
  const { tokens: coinbaseTokens = [], isLoading: isLoadingCoinbaseTokens } = useCoinbaseBuyTokens()
  const { tokens: rampTokens = [], isLoading: isLoadingRampTokens } = useRampBuyTokens(currency)

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
