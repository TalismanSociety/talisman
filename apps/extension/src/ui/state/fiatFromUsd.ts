import { bind } from "@react-rxjs/core"
import { TokenRateData, TokenRates } from "@talismn/token-rates"
import { isNotNil } from "@talismn/util"
import { fromPairs, toPairs, values } from "lodash-es"
import { combineLatest, map, shareReplay } from "rxjs"

import { selectedCurrency$ } from "./settings"
import { tokenRates$ } from "./tokenRates"

// Token rates for the most expensive token for which we have price for both usd and the selected currency
// Using the most expensive because the higher the prices, the more precise the ratio is.
// Also expensive cryptos seem to have more accurate prices
const refTokenRates$ = combineLatest([tokenRates$, selectedCurrency$]).pipe(
  map(([allTokenRates, selectedCurrency]) => {
    let refTokenRates: TokenRates | null = null
    let refPrice: number | null = null

    for (const rates of values(allTokenRates.tokenRates).filter(isNotNil)) {
      const usd = rates["usd"]?.price
      const custom = rates[selectedCurrency]?.price
      if (!usd || !custom) continue
      if (!refTokenRates || !refPrice || usd > refPrice) {
        refTokenRates = rates
        refPrice = usd
      }
    }

    return refTokenRates
  }),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [useFiatFromUsd, getFiatFromUsd$] = bind(
  (usd: number | null | undefined) =>
    combineLatest([refTokenRates$, selectedCurrency$]).pipe(
      map(([refTokenRates, selectedCurrency]) => {
        if (usd === 0) return 0
        if (selectedCurrency === "usd") return usd
        if (!refTokenRates || !usd) return null
        const usdRate = refTokenRates["usd"]?.price
        const targetRate = refTokenRates[selectedCurrency]?.price
        if (!usdRate || !targetRate) return null
        return (usd / usdRate) * targetRate
      }),
    ),
  null,
)

export const [useTokenRatesFromUsd, getTokenRatesFromUsd$] = bind(
  (usd: number | null | undefined) =>
    refTokenRates$.pipe(
      map((refTokenRates): TokenRates | null => {
        const usdRate = refTokenRates?.["usd"]?.price
        if (!refTokenRates || !usd || !usdRate) return null
        if (usd === 0)
          return fromPairs(
            toPairs(refTokenRates).map(([currency]) => [currency, null] as const),
          ) as TokenRates

        return fromPairs(
          toPairs(refTokenRates).map(([currency, rate]) => {
            if (!rate) return [currency, null] as const
            const data: TokenRateData = {
              price: (usd / usdRate) * rate.price,
            }
            return [currency, data] as const
          }),
        ) as TokenRates
      }),
    ),
  null,
)
