// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { lifiSwapModule } from "@ui/domains/Swap/swap-modules/lifi-swap-module"
import { useTokensMap } from "@ui/state/chaindata"
import type { TFunction } from "i18next"
import { useCallback, useRef } from "react"

import type { SupportedSwapProtocol } from "./swap-modules/common.swap-module"
import { simpleswapSwapModule } from "./swap-modules/simpleswap-swap-module"
import { stealthexSwapModule } from "./swap-modules/stealthex-swap-module"
import {
  type AssetRegistry,
  buildAssetRegistry,
  filterAndSortTokens,
} from "./swap-services/token-filtering"

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
 * Fetches from/to assets from all swap modules.
 * Returns tokenId arrays and support maps.
 */
export const useSwapAssets = (
  fromTokenId: string | null,
  tokenTab: string,
  t: TFunction,
  safeTokens: Set<string>
) => {
  const tokensMap = useTokensMap()
  const tokensCount = Object.keys(tokensMap).length

  const fromAssetsQuery = useQuery({
    queryKey: ["swap-from-assets", tokenTab, safeTokens.size, tokensCount],
    queryFn: async ({ signal }) => {
      const moduleResults: Array<[SupportedSwapProtocol, string[]]> = await Promise.all(
        swapModules.map(async (m) => {
          const ids = await withRetry(() => m.getFromAssets(signal), signal)
          return [m.protocol, ids as string[]] as [SupportedSwapProtocol, string[]]
        })
      )
      const registry = buildAssetRegistry(moduleResults, tokensMap)
      const sorted = await filterAndSortTokens(
        registry.tokenIds,
        tokensMap,
        "",
        safeTokens,
        tokenTab,
        t
      )
      return { tokenIds: sorted, supportMap: registry.supportMap } as AssetRegistry
    },
    enabled: tokensCount > 0,
    placeholderData: keepPreviousData,
  })

  // Use fromAssetsQuery's support map to filter modules for toAssetsQuery
  const fromSupportMapInternal = fromAssetsQuery.data?.supportMap ?? null

  const hasFromSupportMap = fromSupportMapInternal !== null && fromSupportMapInternal.size > 0

  const toAssetsQuery = useQuery({
    queryKey: [
      "swap-to-assets",
      fromTokenId,
      tokenTab,
      safeTokens.size,
      tokensCount,
      hasFromSupportMap,
    ],
    queryFn: async ({ signal }) => {
      const modules = swapModules.filter((m) =>
        fromTokenId && fromSupportMapInternal
          ? (fromSupportMapInternal.get(fromTokenId)?.has(m.protocol) ?? false)
          : true
      )
      const moduleResults: Array<[SupportedSwapProtocol, string[]]> = await Promise.all(
        modules.map(async (m) => {
          const ids = await withRetry(() => m.getToAssets(fromTokenId, signal), signal)
          return [m.protocol, ids as string[]] as [SupportedSwapProtocol, string[]]
        })
      )
      const registry = buildAssetRegistry(moduleResults, tokensMap)
      const sorted = await filterAndSortTokens(
        registry.tokenIds,
        tokensMap,
        "",
        safeTokens,
        tokenTab,
        t
      )
      return { tokenIds: sorted, supportMap: registry.supportMap } as AssetRegistry
    },
    enabled: tokensCount > 0,
    placeholderData: keepPreviousData,
  })

  return {
    fromAssetIds: fromAssetsQuery.data?.tokenIds,
    toAssetIds: toAssetsQuery.data?.tokenIds,
    fromSupportMap: fromAssetsQuery.data?.supportMap ?? null,
    toSupportMap: toAssetsQuery.data?.supportMap ?? null,
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
 * Returns a callback to swap from↔to tokenIds and amounts.
 */
export const useReverse = (
  fromTokenId: string | null,
  setFromTokenId: (v: string | null) => void,
  toTokenId: string | null,
  setToTokenId: (v: string | null) => void,
  setFromAmount: (v: bigint) => void,
  toAmount: bigint | null
) => {
  const toAmountRef = useRef(toAmount)
  toAmountRef.current = toAmount

  return useCallback(() => {
    if (toAmountRef.current) setFromAmount(toAmountRef.current)
    setFromTokenId(toTokenId)
    setToTokenId(fromTokenId)
  }, [fromTokenId, setFromAmount, setFromTokenId, setToTokenId, toTokenId])
}
