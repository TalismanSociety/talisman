import { settingsStore } from "@core/domains/app/store.settings"
import { describe, expect, it, vi } from "vitest"

import {
  getSwapLifiSlippageDecimal,
  parseSwapLifiSlippagePercent,
  SWAP_LIFI_SLIPPAGE_DEFAULT,
  toLifiSlippageDecimal,
} from "./useSwapLifiSlippage"

describe("useSwapLifiSlippage helpers", () => {
  it("uses default slippage when value is invalid", () => {
    expect(parseSwapLifiSlippagePercent(undefined)).toBe(SWAP_LIFI_SLIPPAGE_DEFAULT)
    expect(parseSwapLifiSlippagePercent(-1)).toBe(SWAP_LIFI_SLIPPAGE_DEFAULT)
    expect(parseSwapLifiSlippagePercent(100.001)).toBe(SWAP_LIFI_SLIPPAGE_DEFAULT)
  })

  it("accepts values between 0 and 100 with up to 2 decimals", () => {
    expect(parseSwapLifiSlippagePercent(0)).toBe(0)
    expect(parseSwapLifiSlippagePercent(0.5)).toBe(0.5)
    expect(parseSwapLifiSlippagePercent(12.34)).toBe(12.34)
    expect(parseSwapLifiSlippagePercent(100)).toBe(100)
  })

  it("converts percent to LI.FI decimal format", () => {
    expect(toLifiSlippageDecimal(0.5)).toBe(0.005)
    expect(toLifiSlippageDecimal(1)).toBe(0.01)
    expect(toLifiSlippageDecimal(100)).toBe(1)
  })

  it("reads settings and returns decimal slippage", async () => {
    const getSpy = vi.spyOn(settingsStore, "get")
    getSpy.mockResolvedValueOnce(2.25)

    await expect(getSwapLifiSlippageDecimal()).resolves.toBe(0.0225)
  })
})
