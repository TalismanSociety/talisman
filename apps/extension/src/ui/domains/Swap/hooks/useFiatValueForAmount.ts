import { useMemo } from "react"

import { useSelectedCurrency, useTokenRatesMap, useTokensMap } from "@ui/state"

import { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"
import { Decimal } from "../swaps-port/Decimal"
import { useTokenRatesFromUsd } from "../swaps-port/useTokenRatesFromUsd"

type UseFiatValueForAmountProps = {
  amount?: Decimal
  asset?: SwappableAssetWithDecimals | null
  usdOverride?: number
}
export const useFiatValueForAmount = ({
  amount,
  asset,
  usdOverride,
}: UseFiatValueForAmountProps) => {
  const currency = useSelectedCurrency()
  const tokens = useTokensMap()
  const rates = useTokenRatesMap()

  const fiatOverride = useTokenRatesFromUsd(usdOverride)

  const bestGuessRate = useMemo(() => {
    if (!asset) return null
    const confirmedRate = rates[asset.id]
    if (confirmedRate) return confirmedRate
    return Object.entries(rates ?? {}).find(([id]) => tokens[id]?.symbol === asset.symbol)?.[1]
  }, [asset, rates, tokens])

  return useMemo(() => {
    if (!asset) return null
    if (!bestGuessRate || amount === undefined) return fiatOverride?.[currency]?.price
    const rateInCurrency = bestGuessRate[currency]?.price
    if (!rateInCurrency) return null
    return +amount?.toString() * rateInCurrency
  }, [amount, bestGuessRate, currency, fiatOverride, asset])
}
