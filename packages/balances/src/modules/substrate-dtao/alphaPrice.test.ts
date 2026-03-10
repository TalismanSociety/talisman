import {
  ALPHA_PRICE_SCALE,
  alphaToTao,
  getScaledAlphaPrice,
  TAO_DECIMALS,
  taoToAlpha,
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

describe("getScaledAlphaPrice", () => {
  it("computes (taoIn * SCALE) / alphaIn for normal values", () => {
    // taoIn=1000, alphaIn=2000 → (1000 * 1e9) / 2000 = 500_000_000
    expect(getScaledAlphaPrice(2000n, 1000n)).toBe(500_000_000n)
  })

  it("returns 0n when alphaIn is 0n", () => {
    expect(getScaledAlphaPrice(0n, 1000n)).toBe(0n)
  })

  it("returns 0n when taoIn is 0n", () => {
    expect(getScaledAlphaPrice(2000n, 0n)).toBe(0n)
  })

  it("returns ALPHA_PRICE_SCALE when alphaIn equals taoIn", () => {
    expect(getScaledAlphaPrice(500n, 500n)).toBe(ALPHA_PRICE_SCALE)
  })

  it("returns ALPHA_PRICE_SCALE for 1:1 ratio with large values", () => {
    const amount = 10n ** 18n
    expect(getScaledAlphaPrice(amount, amount)).toBe(ALPHA_PRICE_SCALE)
  })

  it("handles alpha worth more than tao (alphaIn < taoIn)", () => {
    // taoIn=3000, alphaIn=1000 → (3000 * 1e9) / 1000 = 3_000_000_000
    expect(getScaledAlphaPrice(1000n, 3000n)).toBe(3_000_000_000n)
  })
})

describe("alphaToTao", () => {
  it("converts alpha to tao using scaled price", () => {
    const scaledPrice = getScaledAlphaPrice(2000n, 1000n) // 500_000_000
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
    const scaledPrice = getScaledAlphaPrice(2000n, 1000n) // 500_000_000
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

describe("round-trip consistency", () => {
  it("alphaToTao then taoToAlpha recovers original (exact when divisible)", () => {
    const scaledPrice = getScaledAlphaPrice(2000n, 1000n) // 0.5 ratio
    const alpha = 200n
    const tao = alphaToTao(alpha, scaledPrice)
    const recovered = taoToAlpha(tao, scaledPrice)
    expect(recovered).toBe(alpha)
  })

  it("taoToAlpha then alphaToTao recovers original (exact when divisible)", () => {
    const scaledPrice = getScaledAlphaPrice(2000n, 1000n)
    const tao = 100n
    const alpha = taoToAlpha(tao, scaledPrice)
    const recovered = alphaToTao(alpha, scaledPrice)
    expect(recovered).toBe(tao)
  })

  it("round-trip is within ±1 for arbitrary values due to integer rounding", () => {
    const scaledPrice = getScaledAlphaPrice(3000n, 1000n) // 1/3 ratio
    const alpha = 100n
    const tao = alphaToTao(alpha, scaledPrice)
    const recovered = taoToAlpha(tao, scaledPrice)
    // Rounding may lose up to 1 unit
    const diff = alpha > recovered ? alpha - recovered : recovered - alpha
    expect(diff).toBeLessThanOrEqual(1n)
  })
})
