import { remoteConfigStore } from "@extension/core"
import { log } from "@extension/shared"
import { TokenId, TokenList } from "@talismn/chaindata-provider"
import { TokenRatesError, TokenRatesList, fetchTokenRates } from "@talismn/token-rates"
import { assetDiscoveryScanProgressAtom, tokensArrayAtomFamily } from "@ui/atoms"
import { atom, useAtomValue, useSetAtom } from "jotai"
import { atomFamily } from "jotai/utils"
import { useEffect, useState } from "react"

const assetDiscoveryTokenRatesAtom = atom<TokenRatesList>({})

const assetDiscoveryTokenRatesAtomFamily = atomFamily((tokenId: TokenId = "") =>
  atom((get) => {
    if (!tokenId) return null
    const tokenRates = get(assetDiscoveryTokenRatesAtom)
    return tokenRates[tokenId] ?? null
  })
)

export const useAssetDiscoveryTokenRate = (tokenId: TokenId | undefined) =>
  useAtomValue(assetDiscoveryTokenRatesAtomFamily(tokenId))

const missingTokenRatesAtom = atom(async (get) => {
  const [{ tokenIds }, tokens, tokenRates] = await Promise.all([
    get(assetDiscoveryScanProgressAtom),
    get(tokensArrayAtomFamily({ activeOnly: false, includeTestnets: false })),
    get(assetDiscoveryTokenRatesAtom),
  ])
  return tokens.filter((t) => !!t.coingeckoId && !tokenRates[t.id] && tokenIds.includes(t.id))
})

const FETCH_TOKEN_RATES_CACHE: Record<string, Promise<TokenRatesList>> = {}

// use this to prevent multiple fetches for the same token list
const safeFetchTokenRates = async (tokenList: TokenList) => {
  const cacheKey = Object.keys(tokenList).join(",")
  const coingecko = await remoteConfigStore.get("coingecko")

  if (!FETCH_TOKEN_RATES_CACHE[cacheKey]) {
    FETCH_TOKEN_RATES_CACHE[cacheKey] = fetchTokenRates(tokenList, coingecko).finally(() => {
      delete FETCH_TOKEN_RATES_CACHE[cacheKey]
    })
  }

  return FETCH_TOKEN_RATES_CACHE[cacheKey]
}

// this should be called only once on the page
export const useAssetDiscoveryFetchTokenRates = () => {
  const missingTokenRatesList = useAtomValue(missingTokenRatesAtom)
  const setTokenRates = useSetAtom(assetDiscoveryTokenRatesAtom)
  const [canFetch, setCanFetch] = useState(true)

  useEffect(() => {
    // reset on mount
    setTokenRates({})
  }, [setTokenRates])

  useEffect(() => {
    const fetchMissingTokenRates = () => {
      if (!canFetch) return
      if (!missingTokenRatesList.length) return

      // 50 max at a time
      const tokensList = Object.fromEntries(
        missingTokenRatesList.slice(0, 100).map((t) => [t.id, t])
      )
      log.debug(
        "fetching %d token rates out of %d",
        Object.keys(tokensList).length,
        missingTokenRatesList.length
      )
      setCanFetch(false)
      safeFetchTokenRates(tokensList)
        .then((tokenRates) => {
          setTokenRates((prev) => ({ ...prev, ...tokenRates }))
          setCanFetch(true)
        })
        .catch((err) => {
          if (err instanceof TokenRatesError && err.response?.status === 429) {
            const retryAfter = err.response.headers.get("retry-after")
            if (!retryAfter) return
            const timeout = Number(retryAfter) * 1000
            log.debug("429 - retrying in %ss", retryAfter)
            setTimeout(() => setCanFetch(true), timeout)
          }
        })
    }

    const interval = setInterval(fetchMissingTokenRates, 1000)

    fetchMissingTokenRates()

    return () => {
      clearInterval(interval)
    }
  }, [canFetch, missingTokenRatesList, setTokenRates])
}
