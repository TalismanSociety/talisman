import { settingsStore } from "@core/domains/app/store.settings"
import { describe, expect, it, vi } from "vitest"

import {
  getSwapSlippageDecimal,
  parseSwapSlippagePercent,
  SWAP_SLIPPAGE_DEFAULT,
  toSlippageDecimal,
} from "./useSwapSlippage"

describe("useSwapSlippage helpers", () => {
  it("uses default slippage when value is invalid", () => {
    expect(parseSwapSlippagePercent(undefined)).toBe(SWAP_SLIPPAGE_DEFAULT)
    expect(parseSwapSlippagePercent(-1)).toBe(SWAP_SLIPPAGE_DEFAULT)
    expect(parseSwapSlippagePercent(100.001)).toBe(SWAP_SLIPPAGE_DEFAULT)
  })

  it("accepts values between 0 and 100 with up to 2 decimals", () => {
    expect(parseSwapSlippagePercent(0)).toBe(0)
    expect(parseSwapSlippagePercent(0.5)).toBe(0.5)
    expect(parseSwapSlippagePercent(12.34)).toBe(12.34)
    expect(parseSwapSlippagePercent(100)).toBe(100)
  })

  it("converts percent to decimal format", () => {
    expect(toSlippageDecimal(0.5)).toBe(0.005)
    expect(toSlippageDecimal(1)).toBe(0.01)
    expect(toSlippageDecimal(100)).toBe(1)
  })

  it("reads settings and returns decimal slippage", async () => {
    const getSpy = vi.spyOn(settingsStore, "get")
    getSpy.mockResolvedValueOnce(2.25)

    await expect(getSwapSlippageDecimal()).resolves.toBe(0.0225)
  })
})
