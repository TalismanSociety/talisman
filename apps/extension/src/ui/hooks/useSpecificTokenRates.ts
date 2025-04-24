import { Token } from "@talismn/chaindata-provider"
import { fetchTokenRates, TokenRatesList } from "@talismn/token-rates"
import { useQuery } from "@tanstack/react-query"
import { keyBy } from "lodash"
import { useMemo } from "react"

import { useSelectedCurrency, useTokenRatesMap } from "@ui/state"

export const useSpecificTokenRates = (tokens: Token[] | undefined) => {
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
    queryKey: ["useSpecificTokenRates", queryKey],
    queryFn: () => {
      if (!tokens?.length) return {}
      const tokensMap = keyBy(tokens, (t) => t.id)
      return fetchTokenRates(tokensMap, [selectedCurrency])
    },
    // tokens that are enabled should already be loaded in memory
    initialData: enabledTokenRates,
    select: (tokenRates): TokenRatesList => ({ ...enabledTokenRates, ...tokenRates }),
    enabled: !!tokens,
  })
}
