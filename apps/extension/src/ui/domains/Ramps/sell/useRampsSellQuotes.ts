import { useMemo } from "react"

import { useCoinbaseSellQuote } from "../coinbase/useCoinbaseSellQuote"
import { useRampSellQuote } from "../ramp/useRampSellQuote"
import { RampsSellQuoteOptions, RampsSellQuoteQuery } from "./types"

export const useRampsSellQuotes = (config: RampsSellQuoteOptions | null) => {
  const queryRamp = useRampSellQuote(config)
  const queryCoinbase = useCoinbaseSellQuote(config)

  return useMemo<RampsSellQuoteQuery[]>(
    () => [
      { provider: "coinbase", query: queryCoinbase },
      { provider: "ramp", query: queryRamp },
    ],
    [queryRamp, queryCoinbase],
  )
}
