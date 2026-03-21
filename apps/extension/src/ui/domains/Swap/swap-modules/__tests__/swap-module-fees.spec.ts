import { vi } from "vitest"

import type { FeeRouteAsset } from "../fee-utils"

// Mock remoteConfigStore before importing fee-utils
const mockRemoteConfigGet = vi.fn()
vi.mock("@core/domains/app/store.remoteConfig", () => ({
  remoteConfigStore: { get: (...args: unknown[]) => mockRemoteConfigGet(...args) },
}))

// Import after mocks are set up (vitest hoists vi.mock calls)
const {
  STEALTHEX_BUILT_IN_FEE,
  getStealthexTalismanTotalFee,
  getStealthexAdditionalFee,
  decimalToPercent,
  getStealthexAdditionalFeePercent,
  SIMPLESWAP_TALISMAN_FEE,
  SIMPLESWAP_TALISMAN_FEE_DISCOUNTED,
  isSimpleSwapDiscountedRoute,
  getSimpleSwapTalismanFee,
  getSimpleSwapApiKey,
  LIFI_TALISMAN_FEE,
  LIFI_PROTOCOL_FEE,
  getLifiCustomFeeForRoute,
  getLifiTalismanFee,
} = await import("../fee-utils")

// --- Test helpers ---

const subAsset: FeeRouteAsset = { platform: "polkadot" }
const evmAsset: FeeRouteAsset = { platform: "ethereum" }
const solAsset: FeeRouteAsset = { platform: "solana" }

// === StealthEX fee tests ===

describe("StealthEX fee logic", () => {
  describe("STEALTHEX_BUILT_IN_FEE constant", () => {
    it("equals 0.004 (0.4%)", () => {
      expect(STEALTHEX_BUILT_IN_FEE).toBe(0.004)
    })
  })

  describe("getStealthexTalismanTotalFee", () => {
    it("returns 0.005 (0.5%) for substrate → substrate", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: subAsset, toAsset: subAsset })).toBe(0.005)
    })

    it("returns 0.004 (0.4%) for evm → evm", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: evmAsset, toAsset: evmAsset })).toBe(
        STEALTHEX_BUILT_IN_FEE
      )
      expect(getStealthexTalismanTotalFee({ fromAsset: evmAsset, toAsset: evmAsset })).toBe(0.004)
    })

    it("returns 0.006 (0.6%) for substrate → evm", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: subAsset, toAsset: evmAsset })).toBe(0.006)
    })

    it("returns 0.006 (0.6%) for evm → substrate", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: evmAsset, toAsset: subAsset })).toBe(0.006)
    })

    it("is symmetric for cross-type routes", () => {
      const subToEvm = getStealthexTalismanTotalFee({ fromAsset: subAsset, toAsset: evmAsset })
      const evmToSub = getStealthexTalismanTotalFee({ fromAsset: evmAsset, toAsset: subAsset })
      expect(subToEvm).toBe(evmToSub)
    })

    it("evm→evm fee is the lowest (equals BUILT_IN_FEE)", () => {
      const evmToEvm = getStealthexTalismanTotalFee({ fromAsset: evmAsset, toAsset: evmAsset })
      const subToSub = getStealthexTalismanTotalFee({ fromAsset: subAsset, toAsset: subAsset })
      const crossType = getStealthexTalismanTotalFee({ fromAsset: subAsset, toAsset: evmAsset })
      expect(evmToEvm).toBeLessThanOrEqual(subToSub)
      expect(evmToEvm).toBeLessThanOrEqual(crossType)
    })

    it("substrate→substrate is cheaper than cross-type routes", () => {
      const subToSub = getStealthexTalismanTotalFee({ fromAsset: subAsset, toAsset: subAsset })
      const crossType = getStealthexTalismanTotalFee({ fromAsset: subAsset, toAsset: evmAsset })
      expect(subToSub).toBeLessThan(crossType)
    })

    it("returns 0.005 (0.5%) for solana → solana", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: solAsset, toAsset: solAsset })).toBe(0.005)
    })

    it("returns 0.006 (0.6%) for solana → evm", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: solAsset, toAsset: evmAsset })).toBe(0.006)
    })

    it("returns 0.006 (0.6%) for evm → solana", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: evmAsset, toAsset: solAsset })).toBe(0.006)
    })

    it("returns 0.006 (0.6%) for solana → substrate", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: solAsset, toAsset: subAsset })).toBe(0.006)
    })

    it("returns 0.006 (0.6%) for substrate → solana", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: subAsset, toAsset: solAsset })).toBe(0.006)
    })

    it("is symmetric for solana cross-platform routes", () => {
      expect(getStealthexTalismanTotalFee({ fromAsset: solAsset, toAsset: evmAsset })).toBe(
        getStealthexTalismanTotalFee({ fromAsset: evmAsset, toAsset: solAsset })
      )
      expect(getStealthexTalismanTotalFee({ fromAsset: solAsset, toAsset: subAsset })).toBe(
        getStealthexTalismanTotalFee({ fromAsset: subAsset, toAsset: solAsset })
      )
    })
  })

  describe("getStealthexAdditionalFee", () => {
    it("returns totalFee - BUILT_IN_FEE for substrate → substrate", () => {
      const result = getStealthexAdditionalFee({ fromAsset: subAsset, toAsset: subAsset })
      expect(result).toBeCloseTo(0.005 - 0.004, 10)
      expect(result).toBeCloseTo(0.001, 10)
    })

    it("returns 0 for evm → evm (totalFee equals BUILT_IN_FEE)", () => {
      expect(getStealthexAdditionalFee({ fromAsset: evmAsset, toAsset: evmAsset })).toBe(0)
    })

    it("returns totalFee - BUILT_IN_FEE for substrate → evm", () => {
      const result = getStealthexAdditionalFee({ fromAsset: subAsset, toAsset: evmAsset })
      expect(result).toBeCloseTo(0.006 - 0.004, 10)
      expect(result).toBeCloseTo(0.002, 10)
    })

    it("returns totalFee - BUILT_IN_FEE for evm → substrate", () => {
      const result = getStealthexAdditionalFee({ fromAsset: evmAsset, toAsset: subAsset })
      expect(result).toBeCloseTo(0.002, 10)
    })

    it("never returns a negative value", () => {
      // evm→evm is the case where totalFee == BUILT_IN_FEE → result is 0
      expect(
        getStealthexAdditionalFee({ fromAsset: evmAsset, toAsset: evmAsset })
      ).toBeGreaterThanOrEqual(0)
      expect(
        getStealthexAdditionalFee({ fromAsset: subAsset, toAsset: subAsset })
      ).toBeGreaterThanOrEqual(0)
      expect(
        getStealthexAdditionalFee({ fromAsset: subAsset, toAsset: evmAsset })
      ).toBeGreaterThanOrEqual(0)
      expect(
        getStealthexAdditionalFee({ fromAsset: evmAsset, toAsset: subAsset })
      ).toBeGreaterThanOrEqual(0)
    })
  })

  describe("decimalToPercent", () => {
    it("converts 0.01 to 1.0 (1%)", () => {
      expect(decimalToPercent(0.01)).toBe(1)
    })

    it("converts 0.005 to 0.5 (0.5%)", () => {
      expect(decimalToPercent(0.005)).toBe(0.5)
    })

    it("converts 0.004 to 0.4 (0.4%)", () => {
      expect(decimalToPercent(0.004)).toBe(0.4)
    })

    it("converts 0 to 0", () => {
      expect(decimalToPercent(0)).toBe(0)
    })

    it("converts 0.001 to 0.1 (0.1%)", () => {
      expect(decimalToPercent(0.001)).toBe(0.1)
    })

    it("converts 0.002 to 0.2 (0.2%)", () => {
      expect(decimalToPercent(0.002)).toBe(0.2)
    })

    it("rounds to two decimal places in percent form", () => {
      // 0.00333... * 100 * 100 = 33.3... → rounds to 33 → /100 = 0.33
      expect(decimalToPercent(0.00333)).toBe(0.33)
    })
  })

  describe("getStealthexAdditionalFeePercent", () => {
    it("returns 0 for evm → evm", () => {
      expect(getStealthexAdditionalFeePercent({ fromAsset: evmAsset, toAsset: evmAsset })).toBe(0)
    })

    it("returns 0.1 for substrate → substrate (0.001 as percent)", () => {
      expect(getStealthexAdditionalFeePercent({ fromAsset: subAsset, toAsset: subAsset })).toBe(0.1)
    })

    it("returns 0.2 for substrate → evm (0.002 as percent)", () => {
      expect(getStealthexAdditionalFeePercent({ fromAsset: subAsset, toAsset: evmAsset })).toBe(0.2)
    })

    it("returns 0.2 for evm → substrate (0.002 as percent)", () => {
      expect(getStealthexAdditionalFeePercent({ fromAsset: evmAsset, toAsset: subAsset })).toBe(0.2)
    })

    it("equals decimalToPercent(getStealthexAdditionalFee(...))", () => {
      const routes = [
        { fromAsset: subAsset, toAsset: subAsset },
        { fromAsset: evmAsset, toAsset: evmAsset },
        { fromAsset: subAsset, toAsset: evmAsset },
        { fromAsset: evmAsset, toAsset: subAsset },
      ] as const
      for (const route of routes) {
        expect(getStealthexAdditionalFeePercent(route)).toBe(
          decimalToPercent(getStealthexAdditionalFee(route))
        )
      }
    })
  })

  describe("tiered fee structure integrity", () => {
    it("total fee for all route types is >= BUILT_IN_FEE", () => {
      const routes = [
        { fromAsset: subAsset, toAsset: subAsset },
        { fromAsset: evmAsset, toAsset: evmAsset },
        { fromAsset: solAsset, toAsset: solAsset },
        { fromAsset: subAsset, toAsset: evmAsset },
        { fromAsset: evmAsset, toAsset: subAsset },
        { fromAsset: solAsset, toAsset: evmAsset },
        { fromAsset: evmAsset, toAsset: solAsset },
        { fromAsset: solAsset, toAsset: subAsset },
        { fromAsset: subAsset, toAsset: solAsset },
      ] as const
      for (const route of routes) {
        expect(getStealthexTalismanTotalFee(route)).toBeGreaterThanOrEqual(STEALTHEX_BUILT_IN_FEE)
      }
    })

    it("additional fee + BUILT_IN_FEE = total fee", () => {
      const routes = [
        { fromAsset: subAsset, toAsset: subAsset },
        { fromAsset: evmAsset, toAsset: evmAsset },
        { fromAsset: solAsset, toAsset: solAsset },
        { fromAsset: subAsset, toAsset: evmAsset },
        { fromAsset: evmAsset, toAsset: subAsset },
        { fromAsset: solAsset, toAsset: evmAsset },
        { fromAsset: evmAsset, toAsset: solAsset },
        { fromAsset: solAsset, toAsset: subAsset },
        { fromAsset: subAsset, toAsset: solAsset },
      ] as const
      for (const route of routes) {
        const totalFee = getStealthexTalismanTotalFee(route)
        const additionalFee = getStealthexAdditionalFee(route)
        expect(additionalFee + STEALTHEX_BUILT_IN_FEE).toBeCloseTo(totalFee, 10)
      }
    })
  })
})

// === SimpleSwap fee tests ===

describe("SimpleSwap fee logic", () => {
  beforeEach(() => {
    mockRemoteConfigGet.mockReset()
  })

  describe("constants", () => {
    it("SIMPLESWAP_TALISMAN_FEE equals 0.015 (1.5%)", () => {
      expect(SIMPLESWAP_TALISMAN_FEE).toBe(0.015)
    })

    it("SIMPLESWAP_TALISMAN_FEE_DISCOUNTED equals 0.004 (0.4%)", () => {
      expect(SIMPLESWAP_TALISMAN_FEE_DISCOUNTED).toBe(0.004)
    })

    it("discounted fee is lower than standard fee", () => {
      expect(SIMPLESWAP_TALISMAN_FEE_DISCOUNTED).toBeLessThan(SIMPLESWAP_TALISMAN_FEE)
    })
  })

  describe("isSimpleSwapDiscountedRoute", () => {
    it("returns true when currencyFrom is in discounted list", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        simpleswapDiscountedCurrencies: ["dot", "ksm", "eth"],
      })
      expect(await isSimpleSwapDiscountedRoute({ currencyFrom: "dot", currencyTo: "btc" })).toBe(
        true
      )
    })

    it("returns true when currencyTo is in discounted list", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        simpleswapDiscountedCurrencies: ["dot", "ksm", "eth"],
      })
      expect(await isSimpleSwapDiscountedRoute({ currencyFrom: "btc", currencyTo: "eth" })).toBe(
        true
      )
    })

    it("returns true when both currencies are in discounted list", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        simpleswapDiscountedCurrencies: ["dot", "eth"],
      })
      expect(await isSimpleSwapDiscountedRoute({ currencyFrom: "dot", currencyTo: "eth" })).toBe(
        true
      )
    })

    it("returns false when neither currency is in discounted list", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        simpleswapDiscountedCurrencies: ["dot", "ksm"],
      })
      expect(await isSimpleSwapDiscountedRoute({ currencyFrom: "btc", currencyTo: "sol" })).toBe(
        false
      )
    })

    it("returns false when discounted list is empty", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        simpleswapDiscountedCurrencies: [],
      })
      expect(await isSimpleSwapDiscountedRoute({ currencyFrom: "dot", currencyTo: "eth" })).toBe(
        false
      )
    })

    it("defaults to empty array when simpleswapDiscountedCurrencies is missing", async () => {
      mockRemoteConfigGet.mockResolvedValue({})
      expect(await isSimpleSwapDiscountedRoute({ currencyFrom: "dot", currencyTo: "eth" })).toBe(
        false
      )
    })
  })

  describe("getSimpleSwapTalismanFee", () => {
    it("returns discounted fee for discounted routes", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        simpleswapDiscountedCurrencies: ["dot"],
      })
      expect(await getSimpleSwapTalismanFee({ currencyFrom: "dot", currencyTo: "btc" })).toBe(
        SIMPLESWAP_TALISMAN_FEE_DISCOUNTED
      )
    })

    it("returns standard fee for non-discounted routes", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        simpleswapDiscountedCurrencies: ["dot"],
      })
      expect(await getSimpleSwapTalismanFee({ currencyFrom: "btc", currencyTo: "sol" })).toBe(
        SIMPLESWAP_TALISMAN_FEE
      )
    })

    it("returns standard fee when no discounted currencies exist", async () => {
      mockRemoteConfigGet.mockResolvedValue({})
      expect(await getSimpleSwapTalismanFee({ currencyFrom: "dot", currencyTo: "eth" })).toBe(
        SIMPLESWAP_TALISMAN_FEE
      )
    })
  })

  describe("getSimpleSwapApiKey", () => {
    it("returns discounted API key for discounted routes", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        simpleswapDiscountedCurrencies: ["dot"],
        simpleswapApiKeyDiscounted: "discounted-key-123",
        simpleswapApiKey: "standard-key-456",
      })
      expect(await getSimpleSwapApiKey({ currencyFrom: "dot", currencyTo: "btc" })).toBe(
        "discounted-key-123"
      )
    })

    it("returns standard API key for non-discounted routes", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        simpleswapDiscountedCurrencies: ["dot"],
        simpleswapApiKeyDiscounted: "discounted-key-123",
        simpleswapApiKey: "standard-key-456",
      })
      expect(await getSimpleSwapApiKey({ currencyFrom: "btc", currencyTo: "sol" })).toBe(
        "standard-key-456"
      )
    })
  })
})

// === LI.FI fee tests ===

describe("LI.FI fee logic", () => {
  beforeEach(() => {
    mockRemoteConfigGet.mockReset()
  })

  describe("constants", () => {
    it("LIFI_TALISMAN_FEE equals 0.002 (0.2%)", () => {
      expect(LIFI_TALISMAN_FEE).toBe(0.002)
    })

    it("LIFI_PROTOCOL_FEE equals 0.0025 (0.25%)", () => {
      expect(LIFI_PROTOCOL_FEE).toBe(0.0025)
    })

    it("combined LI.FI + Talisman fee equals 0.0045 (0.45%)", () => {
      expect(LIFI_TALISMAN_FEE + LIFI_PROTOCOL_FEE).toBeCloseTo(0.0045, 10)
    })
  })

  describe("getLifiCustomFeeForRoute", () => {
    it("returns undefined when no custom fees exist", async () => {
      mockRemoteConfigGet.mockResolvedValue({})
      expect(
        await getLifiCustomFeeForRoute({ fromAssetId: "token-a", toAssetId: "token-b" })
      ).toBeUndefined()
    })

    it("returns undefined when lifiCustomFeeTokens is empty", async () => {
      mockRemoteConfigGet.mockResolvedValue({ lifiCustomFeeTokens: {} })
      expect(
        await getLifiCustomFeeForRoute({ fromAssetId: "token-a", toAssetId: "token-b" })
      ).toBeUndefined()
    })

    it("prefers toAsset fee over fromAsset fee", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: {
          "token-a": 0.001,
          "token-b": 0.003,
        },
      })
      const result = await getLifiCustomFeeForRoute({
        fromAssetId: "token-a",
        toAssetId: "token-b",
      })
      expect(result).toBe(0.003)
    })

    it("falls back to fromAsset fee when toAsset has no custom fee", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: {
          "token-a": 0.001,
        },
      })
      const result = await getLifiCustomFeeForRoute({
        fromAssetId: "token-a",
        toAssetId: "token-b",
      })
      expect(result).toBe(0.001)
    })

    it("returns toAsset fee even when it is 0", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: {
          "token-b": 0,
        },
      })
      const result = await getLifiCustomFeeForRoute({
        fromAssetId: "token-a",
        toAssetId: "token-b",
      })
      expect(result).toBe(0)
    })

    it("handles undefined fromAssetId", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: { "token-b": 0.005 },
      })
      const result = await getLifiCustomFeeForRoute({
        fromAssetId: undefined,
        toAssetId: "token-b",
      })
      expect(result).toBe(0.005)
    })

    it("handles undefined toAssetId", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: { "token-a": 0.005 },
      })
      const result = await getLifiCustomFeeForRoute({
        fromAssetId: "token-a",
        toAssetId: undefined,
      })
      expect(result).toBe(0.005)
    })

    it("returns undefined when both asset IDs are undefined", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: { "token-a": 0.005 },
      })
      const result = await getLifiCustomFeeForRoute({
        fromAssetId: undefined,
        toAssetId: undefined,
      })
      expect(result).toBeUndefined()
    })
  })

  describe("getLifiTalismanFee", () => {
    it("returns default TALISMAN_FEE when no custom fees exist", async () => {
      mockRemoteConfigGet.mockResolvedValue({})
      expect(await getLifiTalismanFee({})).toBe(LIFI_TALISMAN_FEE)
    })

    it("returns custom fee when configured for toAsset", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: { "token-b": 0.005 },
      })
      expect(await getLifiTalismanFee({ fromAssetId: "token-a", toAssetId: "token-b" })).toBe(0.005)
    })

    it("returns custom fee when configured for fromAsset only", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: { "token-a": 0.003 },
      })
      expect(await getLifiTalismanFee({ fromAssetId: "token-a", toAssetId: "token-b" })).toBe(0.003)
    })

    it("returns 0 when custom fee is explicitly 0", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: { "token-b": 0 },
      })
      expect(await getLifiTalismanFee({ fromAssetId: "token-a", toAssetId: "token-b" })).toBe(0)
    })

    it("returns default fee when no matching tokens in custom config", async () => {
      mockRemoteConfigGet.mockResolvedValue({
        lifiCustomFeeTokens: { "other-token": 0.01 },
      })
      expect(await getLifiTalismanFee({ fromAssetId: "token-a", toAssetId: "token-b" })).toBe(
        LIFI_TALISMAN_FEE
      )
    })
  })
})

// === Cross-module fee comparison ===

describe("cross-module fee comparison", () => {
  it("all fee constants are positive", () => {
    expect(STEALTHEX_BUILT_IN_FEE).toBeGreaterThan(0)
    expect(SIMPLESWAP_TALISMAN_FEE).toBeGreaterThan(0)
    expect(SIMPLESWAP_TALISMAN_FEE_DISCOUNTED).toBeGreaterThan(0)
    expect(LIFI_TALISMAN_FEE).toBeGreaterThan(0)
    expect(LIFI_PROTOCOL_FEE).toBeGreaterThan(0)
  })

  it("all fee constants are less than 100%", () => {
    expect(STEALTHEX_BUILT_IN_FEE).toBeLessThan(1)
    expect(SIMPLESWAP_TALISMAN_FEE).toBeLessThan(1)
    expect(SIMPLESWAP_TALISMAN_FEE_DISCOUNTED).toBeLessThan(1)
    expect(LIFI_TALISMAN_FEE).toBeLessThan(1)
    expect(LIFI_PROTOCOL_FEE).toBeLessThan(1)
  })
})
