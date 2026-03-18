import type { Token } from "@talismn/chaindata-provider"
import type { TFunction } from "i18next"

import type { SupportedSwapProtocol } from "../swap-modules/common.swap-module"

// ─── Token tab definitions ──────────────────────────────────────────

export type TokenTab = {
  value: string
  label: string
  filter?: (tokenId: string) => boolean
  sort?: (a: string, b: string) => number
}

export const getTokenTabs = ({
  t,
  curatedTokens,
  recentTokenIds,
}: {
  t: TFunction
  curatedTokens?: string[]
  recentTokenIds?: string[]
}): TokenTab[] => {
  const tabs: TokenTab[] = [
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
  ]

  // Recent tab: hidden when no transaction history
  if (recentTokenIds && recentTokenIds.length > 0) {
    const recentSet = new Set(recentTokenIds)
    tabs.push({
      value: "recent",
      label: t("Recent"),
      filter: (tokenId) => recentSet.has(tokenId),
      sort: (a, b) => recentTokenIds.indexOf(a) - recentTokenIds.indexOf(b),
    })
  }

  // Popular tab: hidden when curatedTokens is empty
  if (curatedTokens && curatedTokens.length > 0) {
    tabs.push({
      value: "popular",
      label: t("Popular"),
      filter: (tokenId) => curatedTokens.includes(tokenId),
      sort: (a, b) => curatedTokens.indexOf(a) - curatedTokens.indexOf(b),
    })
  }

  return tabs
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
