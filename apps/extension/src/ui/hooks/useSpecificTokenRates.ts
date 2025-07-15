import { Token } from "@talismn/chaindata-provider"
import { fetchTokenRates, TokenRateCurrency } from "@talismn/token-rates"
import { useQuery } from "@tanstack/react-query"
import { keyBy } from "lodash-es"
import { useMemo } from "react"

import { useSelectedCurrency, useTokenRatesMap } from "@ui/state"

/**
 * Fetches token rates for a specific set of tokens, even if they are not enabled.
 */
export const useSpecificTokenRates = (
  tokens: Token[] | undefined,
  currencyIds?: TokenRateCurrency[],
) => {
  const enabledTokenRates = useTokenRatesMap()
  const selectedCurrency = useSelectedCurrency()

  const queryKey = useMemo(
    () =>
      tokens
        ?.concat()
        .sort()
        .map((t) => t.id)
        .join("::"),
    [tokens],
  )

  return useQuery({
    queryKey: ["useSpecificTokenRates", queryKey, currencyIds],
    queryFn: () => {
      if (!tokens?.length) return {}
      const tokensMap = keyBy(tokens, (t) => t.id)
      return fetchTokenRates(tokensMap, currencyIds ?? [selectedCurrency])
    },
    initialData: enabledTokenRates,
    enabled: !!tokens,
  })
}
