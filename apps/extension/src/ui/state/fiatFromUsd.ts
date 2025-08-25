import { bind } from "@react-rxjs/core"
import { TokenRates } from "@talismn/token-rates"
import { isNotNil } from "@talismn/util"
import { values } from "lodash-es"
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
