import type { TokenRateData, TokenRates } from "@talismn/token-rates"
import { isNotNil, planckToTokens } from "@talismn/util"
import { useToken, useTokensMap } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { useMemo } from "react"

type UseFiatValueForAmountProps = {
  planck: bigint | null | undefined
  tokenId: string | null | undefined
  usdOverride?: number
}
export const useFiatValueForAmount = ({
  planck,
  tokenId,
  usdOverride,
}: UseFiatValueForAmountProps) => {
  const currency = useSelectedCurrency()
  const token = useToken(tokenId ?? undefined)
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
    if (!token) return null
    const confirmedRate = rates[token.id]
    if (confirmedRate) return confirmedRate
    return Object.entries(rates ?? {}).find(([id]) => tokens[id]?.symbol === token.symbol)?.[1]
  }, [token, rates, tokens])

  return useMemo(() => {
    if (!token || !isNotNil(planck)) return null
    if (!bestGuessRate || planck === undefined) return fiatOverride?.[currency]?.price
    const rateInCurrency = bestGuessRate[currency]?.price
    if (!rateInCurrency) return null
    const tokenAmount = Number(planckToTokens(planck.toString(), token.decimals) ?? "0")
    return tokenAmount * rateInCurrency
  }, [planck, token, bestGuessRate, currency, fiatOverride])
}
