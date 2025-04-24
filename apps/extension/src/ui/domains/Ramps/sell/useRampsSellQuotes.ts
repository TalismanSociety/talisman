import { useMemo } from "react"

import { RampsSellQuoteOptions, RampsSellQuoteQuery } from "./types"
import { useRampsSellQuoteCoinbase } from "./useRampsSellQuoteCoinbase"
import { useRampsSellQuoteRamp } from "./useRampsSellQuoteRamp"

export const useRampsSellQuotes = (config: RampsSellQuoteOptions | null) => {
  const queryRamp = useRampsSellQuoteRamp(config)
  const queryCoinbase = useRampsSellQuoteCoinbase(config)

  return useMemo<RampsSellQuoteQuery[]>(
    () => [
      { provider: "coinbase", query: queryCoinbase },
      { provider: "ramp", query: queryRamp },
    ],
    [queryRamp, queryCoinbase],
  )
}
