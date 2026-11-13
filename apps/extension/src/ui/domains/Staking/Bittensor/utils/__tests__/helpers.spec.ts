import { describe, expect, test } from "vitest"

import { getLimitPrice, withPriceTolerance } from "../helpers"

describe("withPriceTolerance", () => {
  test("a buy accepts a higher price, a sell a lower one", () => {
    expect(withPriceTolerance(20_000_000n, "taoToAlpha", 0.005)).toBe(20_100_000n)
    expect(withPriceTolerance(20_000_000n, "alphaToTao", 0.05)).toBe(19_000_000n)
    expect(withPriceTolerance(20_000_000n, "alphaToTao", 0)).toBe(20_000_000n)
  })
})

describe("getLimitPrice", () => {
  const simulation = {
    tao_amount: 1_000_000_000n,
    alpha_amount: 50_000_000_000n,
    tao_fee: 0n,
    alpha_fee: 0n,
  }

  test("is the simulated price moved by the tolerance", () => {
    expect(getLimitPrice(simulation, "taoToAlpha", 0.005)).toBe(20_100_000n)
    expect(getLimitPrice(simulation, "alphaToTao", 0.005)).toBe(19_900_000n)
  })

  test("is zero when the simulation returned no alpha", () => {
    expect(getLimitPrice({ ...simulation, alpha_amount: 0n }, "taoToAlpha", 0.005)).toBe(0n)
  })
})
