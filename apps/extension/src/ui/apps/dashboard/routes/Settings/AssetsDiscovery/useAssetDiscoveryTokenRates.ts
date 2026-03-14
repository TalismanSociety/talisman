import { COINS_API_URL } from "@common/constants"
import { log } from "@common/log"
import { settingsStore } from "@core/domains/app/store.settings"
import { bind } from "@react-rxjs/core"
import type { TokenId, TokenList } from "@talismn/chaindata-provider"
import { fetchTokenRates, TokenRatesError, type TokenRatesList } from "@talismn/token-rates"
import { assetDiscoveryScanProgress$ } from "@ui/state/assetDiscovery"
import { getTokens$ } from "@ui/state/chaindata"
import { type SetStateAction, useEffect, useState } from "react"
import { BehaviorSubject, combineLatest, map } from "rxjs"

const assetDiscoveryAllTokenRates$ = new BehaviorSubject<TokenRatesList>({})

const setTokenRates = (state: SetStateAction<TokenRatesList>) => {
  if (typeof state === "function")
    assetDiscoveryAllTokenRates$.next(state(assetDiscoveryAllTokenRates$.value))
  else assetDiscoveryAllTokenRates$.next(state)
}

export const [useAssetDiscoveryTokenRates] = bind((tokenId: TokenId | null | undefined) =>
  assetDiscoveryAllTokenRates$.pipe(map((rates) => (tokenId && rates[tokenId]) || null))
)

const [useMissingTokenRates] = bind(
  combineLatest([
    assetDiscoveryScanProgress$,
    getTokens$({ activeOnly: false, includeTestnets: false }),
    assetDiscoveryAllTokenRates$,
  ]).pipe(
    map(([scanProgress, tokens, tokenRates]) =>
      tokens.filter(
        (t) => !!t.coingeckoId && !tokenRates[t.id] && scanProgress.tokenIds.includes(t.id)
      )
    )
  )
)

const FETCH_TOKEN_RATES_CACHE: Record<string, Promise<TokenRatesList>> = {}

// use this to prevent multiple fetches for the same token list
const safeFetchTokenRates = async (tokenList: TokenList) => {
  const cacheKey = Object.keys(tokenList).join(",")
  const selectedCurrency = await settingsStore.get("selectedCurrency")

  if (!FETCH_TOKEN_RATES_CACHE[cacheKey]) {
    FETCH_TOKEN_RATES_CACHE[cacheKey] = fetchTokenRates(tokenList, [selectedCurrency], {
      apiUrl: COINS_API_URL,
    }).finally(() => {
      delete FETCH_TOKEN_RATES_CACHE[cacheKey]
    })
  }

  return FETCH_TOKEN_RATES_CACHE[cacheKey]
}

// this should be called only once on the page
export const useAssetDiscoveryFetchTokenRates = () => {
  const missingTokenRatesList = useMissingTokenRates()
  const [canFetch, setCanFetch] = useState(true)

  useEffect(() => {
    // reset on mount
    setTokenRates({})
  }, [])

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
  }, [canFetch, missingTokenRatesList])
}
