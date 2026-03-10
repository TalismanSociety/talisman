import type { Token, TokenId } from "@talismn/chaindata-provider"
import { vi } from "vitest"
import { tryToDeleteOldTokenRatesDb } from "./TalismanTokenRatesDatabase"
import {
  ALL_CURRENCY_IDS,
  DEFAULT_COINSAPI_CONFIG,
  fetchTokenRates,
  TokenRatesError,
} from "./TokenRates"
import { newTokenRates, SUPPORTED_CURRENCIES } from "./types"

// Minimal token factory — only fields that fetchTokenRates touches
const makeToken = (overrides: Partial<Token> = {}): Token =>
  ({
    id: "token-1",
    type: "sub-native",
    coingeckoId: "polkadot",
    ...overrides,
  }) as Token

const makeLpToken = (): Token =>
  ({
    id: "lp-1",
    type: "evm-uniswapv2",
    platform: "ethereum",
    networkId: "1",
    coingeckoId0: "usd-coin",
    coingeckoId1: "wrapped-ethereum",
    tokenAddress0: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`,
    tokenAddress1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`,
  }) as unknown as Token

/** Build a mock fetch that resolves with the given JSON body. */
const mockFetchJson = (body: unknown) =>
  vi.fn().mockResolvedValue({ json: () => Promise.resolve(body) })

// ---------- 1. Constants and factory functions ----------

describe("SUPPORTED_CURRENCIES", () => {
  it("has exactly 21 currencies", () => {
    const keys = Object.keys(SUPPORTED_CURRENCIES)
    expect(keys).toHaveLength(21)
  })

  it("contains 4 crypto currencies", () => {
    for (const id of ["btc", "eth", "dot", "tao"] as const) {
      expect(SUPPORTED_CURRENCIES[id]).toBeDefined()
    }
  })

  it("contains 17 fiat currencies", () => {
    const fiats = [
      "usd",
      "cny",
      "eur",
      "gbp",
      "cad",
      "aud",
      "nzd",
      "jpy",
      "rub",
      "krw",
      "idr",
      "php",
      "thb",
      "vnd",
      "inr",
      "try",
      "sgd",
    ] as const
    for (const id of fiats) {
      expect(SUPPORTED_CURRENCIES[id]).toBeDefined()
    }
  })

  it("every currency has name and symbol strings", () => {
    for (const entry of Object.values(SUPPORTED_CURRENCIES)) {
      expect(typeof entry.name).toBe("string")
      expect(typeof entry.symbol).toBe("string")
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.symbol.length).toBeGreaterThan(0)
    }
  })
})

describe("ALL_CURRENCY_IDS", () => {
  it("is an array of all 21 currency codes", () => {
    expect(ALL_CURRENCY_IDS).toHaveLength(21)
    expect(ALL_CURRENCY_IDS).toEqual(Object.keys(SUPPORTED_CURRENCIES))
  })
})

describe("DEFAULT_COINSAPI_CONFIG", () => {
  it("has apiUrl set to https://coins.talisman.xyz", () => {
    expect(DEFAULT_COINSAPI_CONFIG.apiUrl).toBe("https://coins.talisman.xyz")
  })
})

describe("newTokenRates", () => {
  it("returns an object with all 21 currencies set to null", () => {
    const rates = newTokenRates()
    const keys = Object.keys(rates)
    expect(keys).toHaveLength(21)
    for (const key of keys) {
      expect(rates[key as keyof typeof rates]).toBeNull()
    }
  })

  it("keys match SUPPORTED_CURRENCIES", () => {
    const rates = newTokenRates()
    expect(Object.keys(rates)).toEqual(Object.keys(SUPPORTED_CURRENCIES))
  })
})

// ---------- 2. TokenRatesError class ----------

describe("TokenRatesError", () => {
  it("constructs with message only", () => {
    const err = new TokenRatesError("something failed")
    expect(err.message).toBe("something failed")
    expect(err.response).toBeUndefined()
  })

  it("constructs with message and Response", () => {
    const res = new Response("body", { status: 500 })
    const err = new TokenRatesError("bad response", res)
    expect(err.message).toBe("bad response")
    expect(err.response).toBe(res)
  })

  it("is an instance of Error", () => {
    const err = new TokenRatesError("test")
    expect(err).toBeInstanceOf(Error)
  })

  it("has response property accessible", () => {
    const err = new TokenRatesError("test")
    expect("response" in err).toBe(true)
  })
})

// ---------- 3. fetchTokenRates ----------

describe("fetchTokenRates", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const config = { apiUrl: "https://test-api.example.com" }

  it("returns empty object when no tokens have coingeckoIds", async () => {
    const mockFetch = mockFetchJson([])
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      "no-cg": makeToken({ id: "no-cg", coingeckoId: undefined }),
    }

    const result = await fetchTokenRates(tokens, ["usd"], config)
    expect(result).toEqual({})
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("returns rates for tokens with coingeckoIds", async () => {
    // Single token (polkadot), single currency (usd)
    // API returns compact format: [price, marketCap, change24h][][]
    const apiResponse = [[[7.5, 9_000_000_000, 0.03]]]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      dot: makeToken({ id: "dot", coingeckoId: "polkadot" }),
    }

    const result = await fetchTokenRates(tokens, ["usd"], config)
    expect(result.dot).toEqual({
      usd: { price: 7.5, marketCap: 9_000_000_000, change24h: 0.03 },
    })
  })

  it("returns null rates for tokens without coingeckoId", async () => {
    // API returns rates for the token that has a coingeckoId
    const apiResponse = [[[10, 100, 0.01]]]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      "has-cg": makeToken({ id: "has-cg", coingeckoId: "polkadot" }),
      "no-cg": makeToken({ id: "no-cg", coingeckoId: undefined }),
    }

    const result = await fetchTokenRates(tokens, ["usd"], config)
    expect(result["has-cg"]).toBeDefined()
    expect(result["no-cg"]).toBeNull()
  })

  it("multiple tokens sharing the same coingeckoId get the same rates", async () => {
    // Two tokens share "polkadot" coingeckoId — only one API entry
    const apiResponse = [[[5, 500, 0.02]]]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      "dot-a": makeToken({ id: "dot-a", coingeckoId: "polkadot" }),
      "dot-b": makeToken({ id: "dot-b", coingeckoId: "polkadot" }),
    }

    const result = await fetchTokenRates(tokens, ["usd"], config)
    expect(result["dot-a"]).toEqual(result["dot-b"])
    expect(result["dot-a"]).toEqual({
      usd: { price: 5, marketCap: 500, change24h: 0.02 },
    })
  })

  it("uses correct API URL from config", async () => {
    const apiResponse = [[[1, 2, 3]]]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      t: makeToken({ id: "t", coingeckoId: "polkadot" }),
    }

    await fetchTokenRates(tokens, ["usd"], config)

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test-api.example.com/token-rates",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("sends POST with correct body (coingeckoIds sorted + currencyIds)", async () => {
    const apiResponse = [[[1, 2, 3]], [[4, 5, 6]]]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      t1: makeToken({ id: "t1", coingeckoId: "zzz-coin" }),
      t2: makeToken({ id: "t2", coingeckoId: "aaa-coin" }),
    }

    await fetchTokenRates(tokens, ["usd"], config)

    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    // coingeckoIds should be sorted alphabetically
    expect(body.coingeckoIds).toEqual(["aaa-coin", "zzz-coin"])
    expect(body.currencyIds).toEqual(["usd"])
  })

  it("handles multiple currencies", async () => {
    // polkadot rates for usd and eur
    const apiResponse = [
      [
        [7.5, 9e9, 0.03],
        [6.8, 8e9, 0.02],
      ],
    ]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      dot: makeToken({ id: "dot", coingeckoId: "polkadot" }),
    }

    const result = await fetchTokenRates(tokens, ["usd", "eur"], config)
    expect(result.dot).toEqual({
      usd: { price: 7.5, marketCap: 9e9, change24h: 0.03 },
      eur: { price: 6.8, marketCap: 8e9, change24h: 0.02 },
    })
  })
})

// ---------- 4. TAO currency special logic ----------

describe("fetchTokenRates — TAO currency", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const config = { apiUrl: "https://test-api.example.com" }

  it("injects bittensor coingeckoId and usd currencyId when tao in currencyIds", async () => {
    // We ask for just ["tao"] on a polkadot token.
    // effectiveCoingeckoIds = [...Set(["polkadot"]).add("bittensor")] = ["polkadot", "bittensor"]
    // effectiveCurrencyIds: ["usd"] (tao removed, usd added)
    const apiResponse = [
      [[7.5, 9e9, 0.03]], // polkadot usd (index 0)
      [[50_000, 1e10, 0.05]], // bittensor usd (index 1)
    ]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      dot: makeToken({ id: "dot", coingeckoId: "polkadot" }),
    }

    await fetchTokenRates(tokens, ["tao"], config)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.coingeckoIds).toContain("bittensor")
    expect(body.currencyIds).toContain("usd")
    expect(body.currencyIds).not.toContain("tao")
  })

  it("calculates TOKEN→TAO rate as tokenUsdRate / taoUsdRate", async () => {
    // effectiveCoingeckoIds = ["polkadot", "bittensor"], effectiveCurrencyIds = ["usd"]
    const taoUsd = 400
    const dotUsd = 8
    const apiResponse = [
      [[dotUsd, 9e9, 0.03]], // polkadot usd (index 0)
      [[taoUsd, 1e10, 0.05]], // bittensor usd (index 1)
    ]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      dot: makeToken({ id: "dot", coingeckoId: "polkadot" }),
    }

    const result = await fetchTokenRates(tokens, ["tao"], config)
    expect(result.dot?.tao?.price).toBeCloseTo(dotUsd / taoUsd)
  })

  it("hardcodes TAO→TAO to [1, null, null]", async () => {
    // bittensor token requesting tao currency
    // coingeckoIds sorted: ["bittensor"], effectiveCurrencyIds: ["usd"]
    const apiResponse = [[[400, 1e10, 0.05]]]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      tao: makeToken({ id: "tao", coingeckoId: "bittensor" }),
    }

    const result = await fetchTokenRates(tokens, ["tao"], config)
    expect(result.tao?.tao).toEqual({ price: 1, marketCap: null, change24h: null })
  })

  it("calculates TAO 24h change as (1+tokenChange)/(1+taoChange)-1", async () => {
    const taoChange = 0.05
    const dotChange = 0.1
    // effectiveCoingeckoIds = ["polkadot", "bittensor"]
    const apiResponse = [
      [[8, 9e9, dotChange]], // polkadot usd (index 0)
      [[400, 1e10, taoChange]], // bittensor usd (index 1)
    ]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      dot: makeToken({ id: "dot", coingeckoId: "polkadot" }),
    }

    const result = await fetchTokenRates(tokens, ["tao"], config)
    const expected = (1 + dotChange) / (1 + taoChange) - 1
    expect(result.dot?.tao?.change24h).toBeCloseTo(expected)
  })

  it("returns null TOKEN→TAO rate when taoUsdRate is 0 (division by zero)", async () => {
    // effectiveCoingeckoIds = ["polkadot", "bittensor"]
    const apiResponse = [
      [[8, 9e9, 0.03]], // polkadot usd (index 0)
      [[0, 0, 0]], // bittensor usd = 0 (index 1)
    ]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      dot: makeToken({ id: "dot", coingeckoId: "polkadot" }),
    }

    const result = await fetchTokenRates(tokens, ["tao"], config)
    expect(result.dot?.tao?.price).toBeNull()
  })

  it("includes both tao and regular currencies together", async () => {
    // Request ["usd", "tao"]. effectiveCurrencyIds: ["usd"] (tao removed, usd present)
    // effectiveCoingeckoIds = ["polkadot", "bittensor"]
    const taoUsd = 400
    const dotUsd = 8
    const apiResponse = [
      [[dotUsd, 9e9, 0.03]], // polkadot → usd (index 0)
      [[taoUsd, 1e10, 0.05]], // bittensor → usd (index 1)
    ]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      dot: makeToken({ id: "dot", coingeckoId: "polkadot" }),
    }

    const result = await fetchTokenRates(tokens, ["usd", "tao"], config)
    // Should have both usd and tao rates
    expect(result.dot?.usd?.price).toBe(dotUsd)
    expect(result.dot?.tao?.price).toBeCloseTo(dotUsd / taoUsd)
  })
})

// ---------- 5. LP token handling ----------

describe("fetchTokenRates — LP tokens", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const config = { apiUrl: "https://test-api.example.com" }

  it("evm-uniswapv2 tokens on ethereum extract underlying coingeckoIds", async () => {
    // LP token has coingeckoId0=usd-coin and coingeckoId1=wrapped-ethereum
    // sorted: ["usd-coin", "wrapped-ethereum"]
    const apiResponse = [
      [[1, 1e9, 0.001]], // usd-coin
      [[3500, 4e11, 0.02]], // wrapped-ethereum
    ]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const tokens: Record<TokenId, Token> = {
      "lp-1": makeLpToken(),
    }

    await fetchTokenRates(tokens, ["usd"], config)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.coingeckoIds).toContain("usd-coin")
    expect(body.coingeckoIds).toContain("wrapped-ethereum")
  })

  it("non-ethereum LP tokens are skipped", async () => {
    const mockFetch = mockFetchJson([])
    vi.stubGlobal("fetch", mockFetch)

    const lpOnPolygon = {
      ...makeLpToken(),
      id: "lp-polygon",
      platform: "polygon",
    } as unknown as Token

    const tokens: Record<TokenId, Token> = {
      "lp-polygon": lpOnPolygon,
    }

    const result = await fetchTokenRates(tokens, ["usd"], config)
    // No coingeckoIds to fetch → returns empty
    expect(result).toEqual({})
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("LP token without its own coingeckoId gets null in result", async () => {
    const apiResponse = [
      [[1, 1e9, 0.001]], // usd-coin
      [[3500, 4e11, 0.02]], // wrapped-ethereum
    ]
    const mockFetch = mockFetchJson(apiResponse)
    vi.stubGlobal("fetch", mockFetch)

    const lpToken = makeLpToken()
    const tokens: Record<TokenId, Token> = {
      "lp-1": lpToken,
    }

    const result = await fetchTokenRates(tokens, ["usd"], config)
    // LP token itself has no coingeckoId, so its entry is null
    expect(result["lp-1"]).toBeNull()
  })
})

// ---------- 6. tryToDeleteOldTokenRatesDb ----------

describe("tryToDeleteOldTokenRatesDb", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("calls indexedDB.deleteDatabase with correct name", () => {
    const deleteDb = vi.fn()
    vi.stubGlobal("indexedDB", { deleteDatabase: deleteDb })

    tryToDeleteOldTokenRatesDb()

    expect(deleteDb).toHaveBeenCalledWith("TalismanTokenRates")
  })

  it("does not throw when indexedDB.deleteDatabase throws", () => {
    vi.stubGlobal("indexedDB", {
      deleteDatabase: () => {
        throw new Error("not available")
      },
    })

    expect(() => tryToDeleteOldTokenRatesDb()).not.toThrow()
  })

  it("does not throw when indexedDB is undefined", () => {
    vi.stubGlobal("indexedDB", undefined)

    expect(() => tryToDeleteOldTokenRatesDb()).not.toThrow()
  })
})
