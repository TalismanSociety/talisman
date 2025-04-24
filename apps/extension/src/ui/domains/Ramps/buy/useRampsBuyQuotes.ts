import { useMemo } from "react"

import { RampsBuyQuoteOptions, RampsBuyQuoteQuery } from "./types"
import { useRampsBuyQuoteCoinbase } from "./useRampsBuyQuoteCoinbase"
import { useRampsBuyQuoteRamp } from "./useRampsBuyQuoteRamp"

export const useRampsBuyQuotes = (config: RampsBuyQuoteOptions | null) => {
  const queryRamp = useRampsBuyQuoteRamp(config)
  const queryCoinbase = useRampsBuyQuoteCoinbase(config)

  return useMemo<RampsBuyQuoteQuery[]>(
    () => [
      { provider: "coinbase", query: queryCoinbase },
      { provider: "ramp", query: queryRamp },
    ],
    [queryRamp, queryCoinbase],
  )
}
