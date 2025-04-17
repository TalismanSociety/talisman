import { Token } from "@talismn/chaindata-provider"
import { fetchTokenRates } from "@talismn/token-rates"
import { useQuery } from "@tanstack/react-query"
import { keyBy } from "lodash"
import { useMemo } from "react"

import { useSelectedCurrency } from "@ui/state"

export const useSpecificTokenRates = (tokens: Token[] | undefined) => {
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
      if (!tokens?.length) return null
      const tokensMap = keyBy(tokens, (t) => t.id)
      return fetchTokenRates(tokensMap, [selectedCurrency])
    },
    enabled: !!tokens,
    refetchOnWindowFocus: false,
  })
}
