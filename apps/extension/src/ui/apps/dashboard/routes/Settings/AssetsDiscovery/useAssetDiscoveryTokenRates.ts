import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { log } from "@core/log"
import { TokenId, TokenList } from "@talismn/chaindata-provider"
import { TokenRates, TokenRatesList, fetchTokenRates } from "@talismn/token-rates"
import { assetDiscoveryScanProgress, tokensArrayQuery } from "@ui/atoms"
import axios from "axios"
import { useEffect, useState } from "react"
import {
  atom,
  selector,
  selectorFamily,
  useRecoilValue,
  useSetRecoilState,
  waitForAll,
} from "recoil"

const assetDiscoveryTokenRatesState = atom<TokenRatesList>({
  key: "assetDiscoveryTokenRatesState",
  default: {},
})

const assetDiscoveryTokenRatesQuery = selectorFamily<TokenRates | null, TokenId | undefined>({
  key: "assetDiscoveryTokenRatesQuery",
  get:
    (tokenId: TokenId = "") =>
    // eslint-disable-next-line react/display-name
    ({ get }): TokenRates | null => {
      const tokenRates = get(assetDiscoveryTokenRatesState)
      return tokenRates[tokenId] ?? null
    },
})

export const useAssetDiscoveryTokenRate = (tokenId: TokenId | undefined) =>
  useRecoilValue(assetDiscoveryTokenRatesQuery(tokenId))

const missingTokenRatesState = selector({
  key: "missingTokenRatesState",
  get: ({ get }) => {
    const [{ tokenIds }, tokens, tokenRates] = get(
      waitForAll([
        assetDiscoveryScanProgress,
        tokensArrayQuery({ activeOnly: false, includeTestnets: false }),
        assetDiscoveryTokenRatesState,
      ])
    )
    return tokens.filter((t) => !!t.coingeckoId && !tokenRates[t.id] && tokenIds.includes(t.id))
  },
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
  const missingTokenRatesList = useRecoilValue(missingTokenRatesState)
  const setTokenRates = useSetRecoilState(assetDiscoveryTokenRatesState)
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
          if (
            axios.isAxiosError(err) &&
            err.response?.status === 429 &&
            err.response.headers["retry-after"]
          ) {
            const timeout = Number(err.response.headers["retry-after"]) * 1000
            log.debug("429 - retrying in %ss", err.response.headers["retry-after"])
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
