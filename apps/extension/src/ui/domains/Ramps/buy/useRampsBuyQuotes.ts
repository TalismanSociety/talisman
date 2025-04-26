import { useMemo } from "react"

import { useCoinbaseBuyQuote } from "../coinbase/useCoinbaseBuyQuote"
import { useRampBuyQuote } from "../ramp/useRampBuyQuote"
import { RampsBuyQuoteOptions, RampsBuyQuoteQuery } from "./types"

export const useRampsBuyQuotes = (config: RampsBuyQuoteOptions | null) => {
  const queryRamp = useRampBuyQuote(config)
  const queryCoinbase = useCoinbaseBuyQuote(config)

  return useMemo<RampsBuyQuoteQuery[]>(
    () => [
      { provider: "coinbase", query: queryCoinbase },
      { provider: "ramp", query: queryRamp },
    ],
    [queryRamp, queryCoinbase],
  )
}
