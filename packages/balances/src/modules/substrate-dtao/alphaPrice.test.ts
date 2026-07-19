import { describe, expect, it } from "vitest"
import {
  ALPHA_PRICE_SCALE,
  alphaToTao,
  TAO_DECIMALS,
  taoToAlpha,
  taoToAlphaCeil,
} from "./alphaPrice"

describe("TAO_DECIMALS", () => {
  it("equals 9n", () => {
    expect(TAO_DECIMALS).toBe(9n)
  })
})

describe("ALPHA_PRICE_SCALE", () => {
  it("equals 10^9", () => {
    expect(ALPHA_PRICE_SCALE).toBe(1_000_000_000n)
  })
})

describe("alphaToTao", () => {
  it("converts alpha to tao using scaled price", () => {
    const scaledPrice = 500_000_000n // 0.5 tao per alpha
    // 100 alpha at 0.5 tao/alpha → 50 tao
    // (100 * 500_000_000) / 1_000_000_000 = 50
    expect(alphaToTao(100n, scaledPrice)).toBe(50n)
  })

  it("returns 0n when alpha is 0n", () => {
    expect(alphaToTao(0n, 500_000_000n)).toBe(0n)
  })

  it("returns 0n when scaledAlphaPrice is 0n", () => {
    expect(alphaToTao(100n, 0n)).toBe(0n)
  })

  it("returns the same value when price is 1:1", () => {
    expect(alphaToTao(1000n, ALPHA_PRICE_SCALE)).toBe(1000n)
  })
})

describe("taoToAlpha", () => {
  it("converts tao to alpha using scaled price", () => {
    const scaledPrice = 500_000_000n // 0.5 tao per alpha
    // 50 tao at 0.5 tao/alpha → 100 alpha
    // (50 * 1_000_000_000) / 500_000_000 = 100
    expect(taoToAlpha(50n, scaledPrice)).toBe(100n)
  })

  it("returns 0n when tao is 0n", () => {
    expect(taoToAlpha(0n, 500_000_000n)).toBe(0n)
  })

  it("returns 0n when scaledAlphaPrice is 0n", () => {
    expect(taoToAlpha(100n, 0n)).toBe(0n)
  })

  it("returns the same value when price is 1:1", () => {
    expect(taoToAlpha(1000n, ALPHA_PRICE_SCALE)).toBe(1000n)
  })
})

describe("taoToAlphaCeil", () => {
  it("rounds up when the division is inexact", () => {
    const scaledPrice = 3_000_000_000n // 3 tao per alpha
    // 100 tao / 3 = 33.33… alpha
    expect(taoToAlpha(100n, scaledPrice)).toBe(33n)
    expect(taoToAlphaCeil(100n, scaledPrice)).toBe(34n)
  })

  it("equals taoToAlpha when the division is exact", () => {
    const scaledPrice = 500_000_000n // 0.5 tao per alpha
    expect(taoToAlphaCeil(50n, scaledPrice)).toBe(taoToAlpha(50n, scaledPrice))
  })

  it("returns 0n on zero inputs", () => {
    expect(taoToAlphaCeil(0n, 500_000_000n)).toBe(0n)
    expect(taoToAlphaCeil(100n, 0n)).toBe(0n)
  })

  it("always converts back to at least the requested tao, where the floored variant can fall short", () => {
    const scaledPrice = 3_000_000_000n // 3 tao per alpha
    for (const tao of [1n, 7n, 100n, 12_345n]) {
      expect(alphaToTao(taoToAlphaCeil(tao, scaledPrice), scaledPrice)).toBeGreaterThanOrEqual(tao)
    }
    // the floored threshold misses the bound: keeping/sending exactly it fails the chain check
    expect(alphaToTao(taoToAlpha(100n, scaledPrice), scaledPrice)).toBeLessThan(100n)
  })
})

describe("round-trip consistency", () => {
  it("alphaToTao then taoToAlpha recovers original (exact when divisible)", () => {
    const scaledPrice = 500_000_000n // 0.5 ratio
    const alpha = 200n
    const tao = alphaToTao(alpha, scaledPrice)
    const recovered = taoToAlpha(tao, scaledPrice)
    expect(recovered).toBe(alpha)
  })

  it("taoToAlpha then alphaToTao recovers original (exact when divisible)", () => {
    const scaledPrice = 500_000_000n
    const tao = 100n
    const alpha = taoToAlpha(tao, scaledPrice)
    const recovered = alphaToTao(alpha, scaledPrice)
    expect(recovered).toBe(tao)
  })

  it("round-trip is within ±1 for arbitrary values due to integer rounding", () => {
    const scaledPrice = 333_333_333n // 1/3 ratio
    const alpha = 100n
    const tao = alphaToTao(alpha, scaledPrice)
    const recovered = taoToAlpha(tao, scaledPrice)
    // Rounding may lose up to 1 unit
    const diff = alpha > recovered ? alpha - recovered : recovered - alpha
    expect(diff).toBeLessThanOrEqual(1n)
  })
})
