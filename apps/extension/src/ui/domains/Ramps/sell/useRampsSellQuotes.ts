import { useMemo } from "react"

import { RampsSellQuoteOptions, RampsSellQuoteQuery } from "./types"
import { useRampsSellQuoteCoinbase } from "./useRampsSellQuoteCoinbase"
import { useRampsSellQuoteRamp } from "./useRampsSellQuoteRamp"

export const useRampsSellQuotes = (config: RampsSellQuoteOptions | null) => {
  const queryRamp = useRampsSellQuoteRamp(config)
  const queryCoinbase = useRampsSellQuoteCoinbase(config)

  return useMemo<RampsSellQuoteQuery[]>(
    () => [
      { provider: "ramp", query: queryRamp },
      { provider: "coinbase", query: queryCoinbase },
    ],
    [queryRamp, queryCoinbase],
  )
}
