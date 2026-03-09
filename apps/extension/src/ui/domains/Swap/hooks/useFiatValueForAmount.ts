import type { TokenRateData, TokenRates } from "@talismn/token-rates"
import { planckToTokens } from "@talismn/util"
import { useTokensMap } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { useMemo } from "react"

import type { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"

type UseFiatValueForAmountProps = {
  planck?: bigint
  asset?: SwappableAssetWithDecimals | null
  usdOverride?: number
}
export const useFiatValueForAmount = ({
  planck,
  asset,
  usdOverride,
}: UseFiatValueForAmountProps) => {
  const currency = useSelectedCurrency()
  const tokens = useTokensMap()
  const rates = useTokenRatesMap()

  const fiatOverride = useMemo((): TokenRates | null => {
    if (usdOverride === undefined || usdOverride === null) return null
    const defaultTokenRate = Object.values(rates ?? {})[0]
    if (!defaultTokenRate) return null
    const baseRate = defaultTokenRate.usd?.price
    if (!baseRate) return null
    const result = {} as Record<string, TokenRateData>
    for (const [cur, rate] of Object.entries(defaultTokenRate)) {
      if (rate !== null && rate !== undefined) {
        result[cur] = { price: (usdOverride * rate.price) / baseRate }
      }
    }
    return result as TokenRates
  }, [rates, usdOverride])

  const bestGuessRate = useMemo(() => {
    if (!asset) return null
    const confirmedRate = rates[asset.id]
    if (confirmedRate) return confirmedRate
    return Object.entries(rates ?? {}).find(([id]) => tokens[id]?.symbol === asset.symbol)?.[1]
  }, [asset, rates, tokens])

  return useMemo(() => {
    if (!asset) return null
    if (!bestGuessRate || planck === undefined) return fiatOverride?.[currency]?.price
    const rateInCurrency = bestGuessRate[currency]?.price
    if (!rateInCurrency) return null
    const tokenAmount = Number(planckToTokens(planck.toString(), asset.decimals) ?? "0")
    return tokenAmount * rateInCurrency
  }, [planck, asset, bestGuessRate, currency, fiatOverride])
}
