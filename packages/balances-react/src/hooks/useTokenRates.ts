import { IToken, TokenId } from "@talismn/chaindata-provider"
import { TokenRatesList, fetchTokenRates } from "@talismn/token-rates"
import { useEffect, useRef, useState } from "react"

export function useTokenRates(tokens?: Record<TokenId, IToken>): TokenRatesList {
  const generation = useRef(0)

  const [tokenRates, setTokenRates] = useState<TokenRatesList>({})
  useEffect(() => {
    if (!tokens) return
    if (Object.keys(tokens).length < 1) return

    // when we make a new request, we want to ignore any old requests which haven't yet completed
    // otherwise we risk replacing the most recent data with older data
    generation.current = (generation.current + 1) % Number.MAX_SAFE_INTEGER
    const thisGeneration = generation.current

    fetchTokenRates(tokens).then((tokenRates) => {
      if (thisGeneration !== generation.current) return
      setTokenRates(tokenRates)
    })
  }, [tokens])

  return tokenRates
}
