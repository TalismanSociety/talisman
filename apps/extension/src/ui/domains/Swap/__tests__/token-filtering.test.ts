import type { Token } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"
import type { SupportedSwapProtocol } from "../swap-modules/common.swap-module"
import { buildAssetRegistry, getTokenTabs } from "../swap-services/token-filtering"

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

  it("coingecko tabs are flagged", () => {
    const tabs = getTokenTabs({ t: stubT })
    const coingeckoTabs = tabs.filter((tb) => tb.coingecko)

    expect(coingeckoTabs.length).toBeGreaterThanOrEqual(6)
    for (const tab of coingeckoTabs) {
      expect(tab.coingecko).toBe(true)
    }
  })
})
