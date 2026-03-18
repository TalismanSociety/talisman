import type { Token } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"
import type { SupportedSwapProtocol } from "../swap-modules/common.swap-module"
import {
  buildAssetRegistry,
  filterAndSortTokensByTab,
  getTokenTabs,
} from "../swap-services/token-filtering"

// ─── Test helpers ───────────────────────────────────────────────────

/** Minimal mock Token for tokensMap */
function makeToken(id: string, symbol: string, decimals = 18) {
  return { id, symbol, decimals } as unknown as Token
}

function makeTokensMap(entries: Array<[string, Token]>) {
  return Object.fromEntries(entries) as Record<string, Token>
}

const stubT = ((key: string) => key) as unknown as Parameters<typeof getTokenTabs>[0]["t"]

// ─── buildAssetRegistry ─────────────────────────────────────────────

describe("buildAssetRegistry", () => {
  it("includes tokenIds that exist in tokensMap", () => {
    const tokensMap = makeTokensMap([["tok-1", makeToken("tok-1", "TKN")]])
    const result = buildAssetRegistry([["simpleswap", ["tok-1"]]], tokensMap)

    expect(result.tokenIds).toContain("tok-1")
    expect(result.supportMap.get("tok-1")?.has("simpleswap")).toBe(true)
  })

  it("excludes tokenIds not in tokensMap", () => {
    const result = buildAssetRegistry([["simpleswap", ["tok-unknown"]]], {})

    expect(result.tokenIds).toHaveLength(0)
  })

  it("merges protocols from multiple modules for the same tokenId", () => {
    const tokensMap = makeTokensMap([["tok-1", makeToken("tok-1", "TKN")]])
    const result = buildAssetRegistry(
      [
        ["simpleswap", ["tok-1"]],
        ["lifi", ["tok-1"]],
      ],
      tokensMap
    )

    expect(result.tokenIds).toHaveLength(1)
    const protocols = result.supportMap.get("tok-1")!
    expect(protocols.has("simpleswap")).toBe(true)
    expect(protocols.has("lifi")).toBe(true)
  })

  it("deduplicates tokenIds across modules", () => {
    const tokensMap = makeTokensMap([
      ["tok-1", makeToken("tok-1", "AAA")],
      ["tok-2", makeToken("tok-2", "BBB")],
    ])
    const result = buildAssetRegistry(
      [
        ["simpleswap" as SupportedSwapProtocol, ["tok-1", "tok-2"]],
        ["stealthex" as SupportedSwapProtocol, ["tok-1"]],
      ],
      tokensMap
    )

    expect(result.tokenIds).toHaveLength(2)
  })
})

// ─── getTokenTabs ───────────────────────────────────────────────────

describe("getTokenTabs", () => {
  it("returns only 'all' tab when no curated or recent tokens", () => {
    const tabs = getTokenTabs({ t: stubT })

    expect(tabs).toHaveLength(1)
    expect(tabs[0]!.value).toBe("all")
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

  it("shows popular tab when curatedTokens are provided", () => {
    const tabs = getTokenTabs({ t: stubT, curatedTokens: ["tok-1"] })

    expect(tabs.map((t) => t.value)).toContain("popular")
  })

  it("hides popular tab when curatedTokens is empty", () => {
    const tabs = getTokenTabs({ t: stubT, curatedTokens: [] })

    expect(tabs.map((t) => t.value)).not.toContain("popular")
  })

  it("popular tab filters by curated tokenIds", () => {
    const curatedTokens = ["tok-1", "tok-2"]
    const tabs = getTokenTabs({ t: stubT, curatedTokens })
    const popularTab = tabs.find((tb) => tb.value === "popular")!

    expect(popularTab.filter).toBeDefined()
    expect(popularTab.filter!("tok-1")).toBe(true)
    expect(popularTab.filter!("tok-99")).toBe(false)
  })

  it("popular tab sorts by curated order", () => {
    const curatedTokens = ["tok-2", "tok-1"]
    const tabs = getTokenTabs({ t: stubT, curatedTokens })
    const popularTab = tabs.find((tb) => tb.value === "popular")!

    expect(popularTab.sort!("tok-1", "tok-2")).toBeGreaterThan(0)
    expect(popularTab.sort!("tok-2", "tok-1")).toBeLessThan(0)
  })

  it("popular tab label has no emoji", () => {
    const tabs = getTokenTabs({ t: stubT, curatedTokens: ["tok-1"] })
    const popularTab = tabs.find((tb) => tb.value === "popular")!

    expect(popularTab.label).toBe("Popular")
    expect(popularTab.label).not.toContain("🔥")
  })

  it("shows recent tab when recentTokenIds are provided", () => {
    const tabs = getTokenTabs({ t: stubT, recentTokenIds: ["tok-1"] })

    expect(tabs.map((t) => t.value)).toContain("recent")
  })

  it("hides recent tab when recentTokenIds is empty", () => {
    const tabs = getTokenTabs({ t: stubT, recentTokenIds: [] })

    expect(tabs.map((t) => t.value)).not.toContain("recent")
  })

  it("recent tab filters to only recent tokens", () => {
    const recentTokenIds = ["tok-3", "tok-1"]
    const tabs = getTokenTabs({ t: stubT, recentTokenIds })
    const recentTab = tabs.find((tb) => tb.value === "recent")!

    expect(recentTab.filter!("tok-3")).toBe(true)
    expect(recentTab.filter!("tok-1")).toBe(true)
    expect(recentTab.filter!("tok-99")).toBe(false)
  })

  it("recent tab sorts by most recently used first", () => {
    const recentTokenIds = ["tok-3", "tok-1", "tok-2"]
    const tabs = getTokenTabs({ t: stubT, recentTokenIds })
    const recentTab = tabs.find((tb) => tb.value === "recent")!

    // tok-3 (index 0) should come before tok-1 (index 1)
    expect(recentTab.sort!("tok-3", "tok-1")).toBeLessThan(0)
    // tok-2 (index 2) should come after tok-1 (index 1)
    expect(recentTab.sort!("tok-2", "tok-1")).toBeGreaterThan(0)
  })

  it("tab order is All → Recent → Popular", () => {
    const tabs = getTokenTabs({
      t: stubT,
      curatedTokens: ["tok-1"],
      recentTokenIds: ["tok-2"],
    })

    expect(tabs.map((t) => t.value)).toEqual(["all", "recent", "popular"])
  })
})

describe("tab filtering helpers", () => {
  const tokenIds = ["tok-1", "tok-3", "tok-2"]
  const tabs = getTokenTabs({
    t: stubT,
    curatedTokens: ["tok-2", "tok-1"],
    recentTokenIds: ["tok-3", "tok-1"],
  })

  it("applies popular tab filter and sort", () => {
    const filtered = filterAndSortTokensByTab(tokenIds, "popular", tabs)
    expect(filtered).toEqual(["tok-2", "tok-1"])
  })

  it("applies all tab curated sort order", () => {
    const filtered = filterAndSortTokensByTab(tokenIds, "all", tabs)
    expect(filtered).toEqual(["tok-2", "tok-1", "tok-3"])
  })

  it("applies recent tab filter and sort", () => {
    const filtered = filterAndSortTokensByTab(tokenIds, "recent", tabs)
    expect(filtered).toEqual(["tok-3", "tok-1"])
  })
})
