import type { Token } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"
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
})

// ─── getTokenTabs ───────────────────────────────────────────────────

describe("getTokenTabs", () => {
  it("returns only 'all' and `recent` tabs when no curated", () => {
    const tabs = getTokenTabs({ t: stubT })

    expect(tabs).toHaveLength(2)
    expect(tabs[0]!.value).toBe("all")
    expect(tabs[1]!.value).toBe("recent")
  })

  it("has no filter/sort on 'all' tab without curated tokens", () => {
    const tabs = getTokenTabs({ t: stubT })
    const allTab = tabs.find((tb) => tb.value === "all")!

    expect(allTab.filter).toBeUndefined()
    expect(allTab.sort).toBeUndefined()
  })

  it("hides popular tab when curatedTokens is empty", () => {
    const tabs = getTokenTabs({ t: stubT, curatedTokens: [] })

    expect(tabs.map((t) => t.value)).not.toContain("popular")
  })

  it("popular tab label has no emoji", () => {
    const tabs = getTokenTabs({ t: stubT, curatedTokens: ["tok-1"] })
    const popularTab = tabs.find((tb) => tb.value === "popular")!

    expect(popularTab.label).toBe("Popular")
    expect(popularTab.label).not.toContain("🔥")
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
