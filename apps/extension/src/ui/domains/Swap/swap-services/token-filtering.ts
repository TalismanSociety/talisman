import type { Token } from "@talismn/chaindata-provider"
import type { TFunction } from "i18next"

import type { SupportedSwapProtocol } from "../swap-modules/common.swap-module"

// ─── Constants ──────────────────────────────────────────────────────

// const COINGECKO_CATEGORY_TABS = [
//   { value: "meme-token", label: "Memes" },
//   { value: "liquid-staking-tokens", label: "LSTs" },
//   { value: "artificial-intelligence", label: "AI" },
//   { value: "depin", label: "DePIN" },
//   { value: "decentralized-finance-defi", label: "Defi" },
//   { value: "layer-2", label: "L2s" },
// ] as const

const COINGECKO_CATEGORY_TAB_VALUES = [
  "meme-token",
  "liquid-staking-tokens",
  "artificial-intelligence",
  "depin",
  "decentralized-finance-defi",
  "layer-2",
] as const

type CoingeckoCategoryTabValue = (typeof COINGECKO_CATEGORY_TAB_VALUES)[number]

// ─── Token tab definitions ──────────────────────────────────────────

export type TokenTab = {
  value: string
  label: string
  coingecko?: boolean
  filter?: (tokenId: string) => boolean
  sort?: (a: string, b: string) => number
}

export const getTokenTabs = ({
  t,
  curatedTokens,
}: {
  t: TFunction
  curatedTokens?: string[]
}): TokenTab[] => {
  const COINGECKO_CATEGORY_TABS: Record<CoingeckoCategoryTabValue, string> = {
    "meme-token": t("Memes"),
    "liquid-staking-tokens": t("LSTs"),
    "artificial-intelligence": t("AI"),
    "depin": t("DePIN"),
    "decentralized-finance-defi": t("Defi"),
    "layer-2": t("L2s"),
  }

  return [
    {
      value: "all",
      label: t("All tokens"),
      sort: curatedTokens
        ? (a, b) => {
            const ia = curatedTokens.indexOf(a)
            const ib = curatedTokens.indexOf(b)
            if (ia === -1 && ib === -1) return 0
            if (ia === -1) return 1
            if (ib === -1) return -1
            return ia - ib
          }
        : undefined,
    },
    {
      value: "popular",
      label: t("🔥 Popular"),
      filter: curatedTokens ? (tokenId) => curatedTokens.includes(tokenId) ?? false : undefined,
      sort: curatedTokens
        ? (a, b) => curatedTokens.indexOf(a) - curatedTokens.indexOf(b)
        : undefined,
    },
    ...Object.entries(COINGECKO_CATEGORY_TABS).map(([value, label]) => ({
      value,
      label,
      coingecko: true,
    })),
  ]
}

// ─── Asset registry (replaces enrichAssets) ─────────────────────────

export type AssetRegistry = {
  tokenIds: string[]
  supportMap: Map<string, Set<SupportedSwapProtocol>>
}

/**
 * Build a registry of swappable tokenIds and which protocols support each one.
 * Each entry in `moduleResults` is a tuple of [protocol, tokenIds[]].
 * Only tokenIds present in `tokensMap` are included.
 */
export function buildAssetRegistry(
  moduleResults: Array<[SupportedSwapProtocol, string[]]>,
  tokensMap: Record<string, Token | undefined>
): AssetRegistry {
  const supportMap = new Map<string, Set<SupportedSwapProtocol>>()

  for (const [protocol, tokenIds] of moduleResults) {
    for (const tokenId of tokenIds) {
      if (!tokensMap[tokenId]) continue

      let protocols = supportMap.get(tokenId)
      if (!protocols) {
        protocols = new Set()
        supportMap.set(tokenId, protocols)
      }
      protocols.add(protocol)
    }
  }

  const tokenIds = [...supportMap.keys()].sort((a, b) => {
    const symA = (tokensMap[a]?.symbol ?? "").replaceAll("$", "")
    const symB = (tokensMap[b]?.symbol ?? "").replaceAll("$", "")
    return symA.localeCompare(symB)
  })

  return { tokenIds, supportMap }
}

export const getCoingeckoCategoryId = (tokenTab: string): string | undefined => {
  if (!COINGECKO_CATEGORY_TAB_VALUES.includes(tokenTab as CoingeckoCategoryTabValue))
    return undefined
  return tokenTab
}

export const filterAndSortTokensByTab = (
  tokenIds: string[],
  tokenTab: string,
  tokenTabs: TokenTab[]
): string[] => {
  const filter = tokenTabs.find((tb) => tb.value === tokenTab)?.filter
  const sort = tokenTabs.find((tb) => tb.value === tokenTab)?.sort

  let filteredSortedTokens = [...tokenIds]
  if (filter) filteredSortedTokens = filteredSortedTokens.filter(filter)
  if (sort) filteredSortedTokens = filteredSortedTokens.sort(sort)
  return filteredSortedTokens
}
