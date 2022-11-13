import { useTokenRates } from "@talismn/balances-react"
import { IToken } from "@talismn/chaindata-provider"
import { useMemo } from "react"

export function useTokenRatesForTokens(tokens: Array<IToken | undefined>) {
  const tokenList = useMemo(
    () =>
      Object.fromEntries(
        tokens
          .filter((token): token is IToken => token !== undefined)
          .map((token) => token && [token.id, token])
      ),
    [tokens]
  )

  return useTokenRates(tokenList)
}
