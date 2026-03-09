// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { useQuery } from "@tanstack/react-query"
import { lifiSwapModule } from "@ui/domains/Swap/swap-modules/lifi-swap-module"
import { useTokensMap } from "@ui/state/chaindata"
import type { TFunction } from "i18next"
import { useCallback } from "react"

import type {
  SwappableAssetBaseType,
  SwappableAssetWithDecimals,
} from "./swap-modules/common.swap-module"
import { simpleswapSwapModule } from "./swap-modules/simpleswap-swap-module"
import { stealthexSwapModule } from "./swap-modules/stealthex-swap-module"
import { enrichAssets, filterAndSortTokens } from "./swap-services/token-filtering"
import type { Decimal } from "./swaps-port/Decimal"

// ─── Re-exports (backward compatibility) ────────────────────────────

export { useSwapErc20Approval } from "./hooks/useSwapErc20Approval"
export { useSwapQuoteManager as useSwapQuotes } from "./hooks/useSwapQuoteManager"
export { filterAndSortTokens, getTokenTabs } from "./swap-services/token-filtering"

// ─── Constants ──────────────────────────────────────────────────────

export const swapModules = [simpleswapSwapModule, stealthexSwapModule, lifiSwapModule]

// ─── Asset-fetching helpers ─────────────────────────────────────────

const withRetry = async <T>(
  fn: () => Promise<T>,
  signal: AbortSignal,
  retries = 3
): Promise<T | never[]> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (signal.aborted) return []
    try {
      return await fn()
    } catch (cause) {
      if (signal.aborted) return []
      if (attempt === retries) {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.warn(`Asset fetch failed ${retries} times, ignoring`, cause)
        return []
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt))
    }
  }
  return []
}

// ─── Hooks ──────────────────────────────────────────────────────────

/**
 * Fetches from/to assets from all swap modules, enriches with token map data.
 * Returns useQuery results for both from and to asset lists.
 */
export const useSwapAssets = (
  fromAsset: SwappableAssetWithDecimals | null,
  tokenTab: string,
  t: TFunction,
  safeTokens: Set<string>
) => {
  const tokensMap = useTokensMap()
  const tokensCount = Object.keys(tokensMap).length

  const fromAssetsQuery = useQuery({
    queryKey: ["swap-from-assets", tokenTab, safeTokens.size, tokensCount],
    queryFn: async ({ signal }) => {
      const results = await Promise.all(
        swapModules.map((m) => withRetry(() => m.getFromAssets(signal), signal))
      )
      const enriched = enrichAssets(results.flat() as SwappableAssetBaseType[], tokensMap)
      const filtered = enriched.filter((tk) => tk.networkType !== "btc")
      return filterAndSortTokens(filtered, "", safeTokens, tokenTab, t)
    },
    enabled: tokensCount > 0,
  })

  const toAssetsQuery = useQuery({
    queryKey: ["swap-to-assets", fromAsset?.id ?? null, tokenTab, safeTokens.size, tokensCount],
    queryFn: async ({ signal }) => {
      const modules = swapModules.filter((m) => (fromAsset ? fromAsset.context[m.protocol] : true))
      const results = await Promise.all(
        modules.map((m) => withRetry(() => m.getToAssets(fromAsset, signal), signal))
      )
      const enriched = enrichAssets(results.flat() as SwappableAssetBaseType[], tokensMap)
      return filterAndSortTokens(enriched, "", safeTokens, tokenTab, t)
    },
    enabled: tokensCount > 0,
  })

  return {
    fromAssets: fromAssetsQuery.data,
    toAssets: toAssetsQuery.data,
    isLoadingFromAssets: fromAssetsQuery.isLoading,
    isLoadingToAssets: toAssetsQuery.isLoading,
  }
}

/**
 * Fetches safe token sets from Uniswap + Talisman remote config.
 */
export const useSafeTokens = () => {
  return useQuery({
    queryKey: ["swap-safe-tokens"],
    queryFn: async () => {
      const [uniswapSafe, uniswapExtended, talismanSafe] = await Promise.all([
        fetch("https://tokens.uniswap.org/")
          .then((r) => r.json())
          .then(
            (data: { tokens: { chainId: number; address: string }[] }) =>
              new Set(data.tokens.map((tk) => `${tk.chainId}:${tk.address.toLowerCase()}`))
          ),
        fetch("https://extendedtokens.uniswap.org/")
          .then((r) => r.json())
          .then(
            (data: { tokens: { chainId: number; address: string }[] }) =>
              new Set(data.tokens.map((tk) => `${tk.chainId}:${tk.address.toLowerCase()}`))
          ),
        remoteConfigStore.get("swaps").then((swapsConfig) => {
          const lifiTalismanTokens = swapsConfig?.lifiTalismanTokens ?? []
          return new Set(
            lifiTalismanTokens.map((tokenId: string) => {
              const [chainId, _type, contractAddress] = tokenId.split(":")
              return `${chainId}:${contractAddress}`
            })
          )
        }),
      ])
      return new Set([...uniswapSafe, ...uniswapExtended, ...talismanSafe])
    },
    staleTime: Infinity,
  })
}

/**
 * Returns a callback to swap from↔to assets and amounts.
 */
export const useReverse = (
  fromAsset: SwappableAssetWithDecimals | null,
  setFromAsset: (v: SwappableAssetWithDecimals | null) => void,
  toAsset: SwappableAssetWithDecimals | null,
  setToAsset: (v: SwappableAssetWithDecimals | null) => void,
  setFromAmount: (v: Decimal) => void,
  toAmount: Decimal | null
) => {
  return useCallback(() => {
    if (toAmount) setFromAmount(toAmount)
    setFromAsset(toAsset)
    setToAsset(fromAsset)
  }, [fromAsset, setFromAmount, setFromAsset, setToAsset, toAmount, toAsset])
}
