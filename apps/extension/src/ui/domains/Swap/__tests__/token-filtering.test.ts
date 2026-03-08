import { describe, expect, it } from "vitest"

import type {
  SwappableAssetBaseType,
  SwappableAssetWithDecimals,
} from "../swap-modules/common.swap-module"
import { enrichAssets, getTokenTabs } from "../swap-services/token-filtering"

// ─── Test helpers ───────────────────────────────────────────────────

function makeBaseAsset(
  overrides: Partial<SwappableAssetBaseType> & Pick<SwappableAssetBaseType, "id" | "chainId">
): SwappableAssetBaseType {
  return {
    name: overrides.name ?? "Token",
    symbol: overrides.symbol ?? "TKN",
    networkType: overrides.networkType ?? "evm",
    context: overrides.context ?? {},
    ...overrides,
  }
}

const stubT = ((key: string) => key) as unknown as Parameters<typeof getTokenTabs>[0]["t"]

// ─── enrichAssets ───────────────────────────────────────────────────

describe("enrichAssets", () => {
  it("uses token map symbol and decimals when available", () => {
    const assets: SwappableAssetBaseType[] = [
      makeBaseAsset({ id: "tok-1", chainId: 1, symbol: "OLD", decimals: 6 }),
    ]
    const tokensMap = { "tok-1": { symbol: "NEW", decimals: 18 } }

    const result = enrichAssets(assets, tokensMap)

    expect(result).toHaveLength(1)
    expect(result[0]!.symbol).toBe("NEW")
    expect(result[0]!.decimals).toBe(18)
  })

  it("falls back to asset symbol/decimals when token map has no entry", () => {
    const assets: SwappableAssetBaseType[] = [
      makeBaseAsset({ id: "tok-2", chainId: 1, symbol: "FALLBACK", decimals: 8 }),
    ]

    const result = enrichAssets(assets, {})

    expect(result).toHaveLength(1)
    expect(result[0]!.symbol).toBe("FALLBACK")
    expect(result[0]!.decimals).toBe(8)
  })

  it("skips assets with no symbol and no decimals", () => {
    const assets: SwappableAssetBaseType[] = [
      makeBaseAsset({ id: "tok-3", chainId: 1, symbol: undefined, decimals: undefined }),
    ]
    const tokensMap = {}

    const result = enrichAssets(assets, tokensMap)
    expect(result).toHaveLength(0)
  })

  it("uses ETH logo for tokens with symbol 'ETH'", () => {
    const assets: SwappableAssetBaseType[] = [
      makeBaseAsset({
        id: "eth-native",
        chainId: 1,
        symbol: "ETH",
        decimals: 18,
        image: "original.png",
      }),
    ]

    const result = enrichAssets(assets, {})

    expect(result[0]!.image).toContain("eth.svg")
  })

  it("handles BTC native token via btcTokens lookup", () => {
    const assets: SwappableAssetBaseType[] = [
      makeBaseAsset({
        id: "btc-native",
        chainId: "btc",
        networkType: "btc",
        name: "Bitcoin",
      }),
    ]

    const result = enrichAssets(assets, {})

    expect(result).toHaveLength(1)
    expect(result[0]!.symbol).toBe("BTC")
    expect(result[0]!.decimals).toBe(8)
  })

  it("merges context from duplicate assets on same chain", () => {
    const assets: SwappableAssetBaseType[] = [
      makeBaseAsset({
        id: "tok-5",
        chainId: 1,
        symbol: "DUP",
        decimals: 18,
        context: { simpleswap: "a" },
      }),
      makeBaseAsset({
        id: "tok-5",
        chainId: 1,
        symbol: "DUP",
        decimals: 18,
        context: { lifi: "b" },
      }),
    ]

    const result = enrichAssets(assets, {})

    expect(result).toHaveLength(1)
    expect(result[0]!.context).toEqual({ simpleswap: "a", lifi: "b" })
  })

  it("sorts tokens alphabetically within each chain", () => {
    const assets: SwappableAssetBaseType[] = [
      makeBaseAsset({ id: "tok-z", chainId: 1, symbol: "ZZZ", decimals: 18 }),
      makeBaseAsset({ id: "tok-a", chainId: 1, symbol: "AAA", decimals: 18 }),
      makeBaseAsset({ id: "tok-m", chainId: 1, symbol: "MMM", decimals: 18 }),
    ]

    const result = enrichAssets(assets, {})

    expect(result.map((r) => r.symbol)).toEqual(["AAA", "MMM", "ZZZ"])
  })

  it("handles $ in symbol sorting correctly", () => {
    const assets: SwappableAssetBaseType[] = [
      makeBaseAsset({ id: "tok-b", chainId: 1, symbol: "$BBB", decimals: 18 }),
      makeBaseAsset({ id: "tok-a", chainId: 1, symbol: "AAA", decimals: 18 }),
    ]

    const result = enrichAssets(assets, {})

    expect(result.map((r) => r.symbol)).toEqual(["AAA", "$BBB"])
  })
})

// ─── getTokenTabs ───────────────────────────────────────────────────

describe("getTokenTabs", () => {
  it("returns all expected tabs", () => {
    const tabs = getTokenTabs({ t: stubT })

    expect(tabs.length).toBeGreaterThanOrEqual(8)
    expect(tabs.map((t) => t.value)).toContain("all")
    expect(tabs.map((t) => t.value)).toContain("popular")
    expect(tabs.map((t) => t.value)).toContain("meme-token")
  })

  it("has no filter/sort on 'all' tab without curated tokens", () => {
    const tabs = getTokenTabs({ t: stubT })
    const allTab = tabs.find((tb) => tb.value === "all")!

    expect(allTab.filter).toBeUndefined()
    expect(allTab.sort).toBeUndefined()
  })

  it("has sort on 'all' tab with curated tokens", () => {
    const tabs = getTokenTabs({ t: stubT, curatedTokens: ["tok-1", "tok-2"] })
    const allTab = tabs.find((tb) => tb.value === "all")!

    expect(allTab.sort).toBeDefined()
    expect(allTab.filter).toBeUndefined()
  })

  it("popular tab filters by curated tokens", () => {
    const curatedTokens = ["tok-1", "tok-2"]
    const tabs = getTokenTabs({ t: stubT, curatedTokens })
    const popularTab = tabs.find((tb) => tb.value === "popular")!

    expect(popularTab.filter).toBeDefined()

    const included = { id: "tok-1" } as SwappableAssetWithDecimals
    const excluded = { id: "tok-99" } as SwappableAssetWithDecimals

    expect(popularTab.filter!(included)).toBe(true)
    expect(popularTab.filter!(excluded)).toBe(false)
  })

  it("popular tab sorts by curated order", () => {
    const curatedTokens = ["tok-2", "tok-1"]
    const tabs = getTokenTabs({ t: stubT, curatedTokens })
    const popularTab = tabs.find((tb) => tb.value === "popular")!

    const a = { id: "tok-1" } as SwappableAssetWithDecimals
    const b = { id: "tok-2" } as SwappableAssetWithDecimals

    expect(popularTab.sort!(a, b)).toBeGreaterThan(0)
    expect(popularTab.sort!(b, a)).toBeLessThan(0)
  })

  it("coingecko tabs are flagged", () => {
    const tabs = getTokenTabs({ t: stubT })
    const coingeckoTabs = tabs.filter((tb) => tb.coingecko)

    expect(coingeckoTabs.length).toBeGreaterThanOrEqual(6)
    for (const tab of coingeckoTabs) {
      expect(tab.coingecko).toBe(true)
    }
  })
})
