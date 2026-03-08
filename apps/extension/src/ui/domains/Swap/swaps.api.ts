// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { lifiSwapModule } from "@ui/domains/Swap/swap-modules/lifi-swap-module"
import { useTokensMap } from "@ui/state/chaindata"
import type { TFunction } from "i18next"
import { useCallback, useEffect, useState } from "react"

import type {
  SwappableAssetBaseType,
  SwappableAssetWithDecimals,
} from "./swap-modules/common.swap-module"
import { simpleswapSwapModule } from "./swap-modules/simpleswap-swap-module"
import { stealthexSwapModule } from "./swap-modules/stealthex-swap-module"
import { enrichAssets, filterAndSortTokens } from "./swap-services/token-filtering"
import type { Decimal } from "./swaps-port/Decimal"
import type { Loadable } from "./types"

// ─── Re-exports (backward compatibility) ────────────────────────────

export { useSwapErc20Approval } from "./hooks/useSwapErc20Approval"
export { useSwapQuoteManager as useSwapQuotes } from "./hooks/useSwapQuoteManager"
export { filterAndSortTokens, getTokenTabs } from "./swap-services/token-filtering"
export type { Loadable } from "./types"

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
 * Returns Loadable states for both from and to asset lists.
 */
export const useSwapAssets = (
  fromAsset: SwappableAssetWithDecimals | null,
  tokenTab: string,
  t: TFunction,
  safeTokens: Set<string>
) => {
  const tokensMap = useTokensMap()
  const [fromAssetsLoadable, setFromAssetsLoadable] = useState<
    Loadable<SwappableAssetWithDecimals[]>
  >({ state: "loading" })
  const [toAssetsLoadable, setToAssetsLoadable] = useState<Loadable<SwappableAssetWithDecimals[]>>({
    state: "loading",
  })

  // Fetch from assets
  useEffect(() => {
    const controller = new AbortController()
    setFromAssetsLoadable({ state: "loading" })

    const run = async () => {
      try {
        const results = await Promise.all(
          swapModules.map((m) =>
            withRetry(() => m.getFromAssets(controller.signal), controller.signal)
          )
        )
        if (controller.signal.aborted) return

        const enriched = enrichAssets(results.flat() as SwappableAssetBaseType[], tokensMap)
        // from assets should not include btc
        const filtered = enriched.filter((tk) => tk.networkType !== "btc")

        // Apply tab-based filtering
        const tabFiltered = await filterAndSortTokens(filtered, "", safeTokens, tokenTab, t)
        if (controller.signal.aborted) return

        setFromAssetsLoadable({ state: "hasData", data: tabFiltered })
      } catch (error) {
        if (controller.signal.aborted) return
        setFromAssetsLoadable({ state: "hasError", error })
      }
    }
    run()

    return () => controller.abort()
  }, [tokensMap, tokenTab, t, safeTokens])

  // Fetch to assets
  useEffect(() => {
    const controller = new AbortController()
    setToAssetsLoadable({ state: "loading" })

    const run = async () => {
      try {
        const modules = swapModules.filter((m) =>
          fromAsset ? fromAsset.context[m.protocol] : true
        )
        const results = await Promise.all(
          modules.map((m) =>
            withRetry(() => m.getToAssets(fromAsset, controller.signal), controller.signal)
          )
        )
        if (controller.signal.aborted) return

        const enriched = enrichAssets(results.flat() as SwappableAssetBaseType[], tokensMap)
        const tabFiltered = await filterAndSortTokens(enriched, "", safeTokens, tokenTab, t)
        if (controller.signal.aborted) return

        setToAssetsLoadable({ state: "hasData", data: tabFiltered })
      } catch (error) {
        if (controller.signal.aborted) return
        setToAssetsLoadable({ state: "hasError", error })
      }
    }
    run()

    return () => controller.abort()
  }, [fromAsset, tokensMap, tokenTab, t, safeTokens])

  return { fromAssetsLoadable, toAssetsLoadable }
}

/**
 * Fetches safe token sets from Uniswap + Talisman remote config.
 */
export const useSafeTokens = () => {
  const [safeTokensLoadable, setSafeTokensLoadable] = useState<Loadable<Set<string>>>({
    state: "loading",
  })

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
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
        if (cancelled) return

        setSafeTokensLoadable({
          state: "hasData",
          data: new Set([...uniswapSafe, ...uniswapExtended, ...talismanSafe]),
        })
      } catch (error) {
        if (cancelled) return
        setSafeTokensLoadable({ state: "hasError", error })
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [])

  return safeTokensLoadable
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
  toAmountLoadable: Loadable<Decimal | null>
) => {
  return useCallback(() => {
    if (toAmountLoadable.state === "hasData" && toAmountLoadable.data) {
      setFromAmount(toAmountLoadable.data)
    }
    setFromAsset(toAsset)
    setToAsset(fromAsset)
  }, [fromAsset, setFromAmount, setFromAsset, setToAsset, toAmountLoadable, toAsset])
}
