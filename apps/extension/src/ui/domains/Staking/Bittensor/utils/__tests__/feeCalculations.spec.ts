import {
  calculateEffectiveFeeRate,
  calculateFee,
  calculateMinimumStakeInput,
} from "../feeCalculations"

describe("calculateFee", () => {
  test("returns 0n when amount is null", () => {
    expect(calculateFee({ amount: null, feePercent: 0.3, seekDiscount: 0 })).toEqual(0n)
  })

  test("throws error when fee percentage is negative", () => {
    expect(() => calculateFee({ amount: 1_000_000n, feePercent: -0.3, seekDiscount: 0 })).toThrow(
      "Fee percentage cannot be negative",
    )
  })

  test("calculates fee correctly without Seek discount", () => {
    const tests: Array<[amount: bigint, feePercent: number, expected: bigint]> = [
      [1_000_000n, 0.3, 3000n],
      [10_000_000n, 0.3, 30_000n],
      [1_000_000n, 0.5, 5000n],
      [1_000_000n, 0, 0n],
      [2_000_000n, 1, 20_000n],
    ]

    for (const [amount, feePercent, expected] of tests) {
      expect(calculateFee({ amount, feePercent, seekDiscount: 0 })).toEqual(expected)
    }
  })

  test("calculates fee correctly with Seek discount", () => {
    const tests: Array<
      [amount: bigint, feePercent: number, seekDiscount: number, expected: bigint]
    > = [
      [1_000_000n, 0.3, 0.5, 1500n],
      [1_000_000n, 0.3, 1, 0n],
      [1_000_000n, 0.3, 0.25, 2200n],
      [10_000_000n, 0.3, 0.1, 27_000n],
    ]

    for (const [amount, feePercent, seekDiscount, expected] of tests) {
      expect(calculateFee({ amount, feePercent, seekDiscount })).toEqual(expected)
    }
  })

  test("handles typical Bittensor staking amounts", () => {
    const minStake = 2_000_000n
    const fee = calculateFee({ amount: minStake, feePercent: 0.3, seekDiscount: 0 })
    expect(fee).toEqual(6000n)
  })
})

describe("calculateEffectiveFeeRate", () => {
  test("returns 0 for root staking (netuid=0)", () => {
    expect(calculateEffectiveFeeRate(0, 0.3, 0)).toEqual(0)
    expect(calculateEffectiveFeeRate(0, 0.3, 0.5)).toEqual(0)
  })

  test("returns 0 for null netuid", () => {
    expect(calculateEffectiveFeeRate(null, 0.3, 0)).toEqual(0)
  })

  test("converts percentage to decimal for subnet staking", () => {
    expect(calculateEffectiveFeeRate(1, 0.3, 0)).toEqual(0.003)
    expect(calculateEffectiveFeeRate(1, 0.5, 0)).toEqual(0.005)
  })

  test("applies Seek discount correctly", () => {
    expect(calculateEffectiveFeeRate(1, 0.3, 0.5)).toEqual(0.0015)
    expect(calculateEffectiveFeeRate(1, 0.3, 1)).toEqual(0)
    expect(calculateEffectiveFeeRate(1, 0.3, 0.25)).toEqual(0.00225)
  })

  test("works with different subnet IDs", () => {
    expect(calculateEffectiveFeeRate(1, 0.3, 0)).toEqual(0.003)
    expect(calculateEffectiveFeeRate(5, 0.3, 0)).toEqual(0.003)
    expect(calculateEffectiveFeeRate(100, 0.3, 0)).toEqual(0.003)
  })
})

describe("calculateMinimumStakeInput", () => {
  test("returns base minimum when no fees apply", () => {
    const baseMin = 2_000_000n
    expect(calculateMinimumStakeInput(baseMin, 0n, 0)).toEqual(baseMin)
  })

  test("adds swap fee when Talisman fee is zero", () => {
    const baseMin = 2_000_000n
    const swapFee = 40_000n
    expect(calculateMinimumStakeInput(baseMin, swapFee, 0)).toEqual(2_040_000n)
  })

  test("calculates correct minimum with both fees", () => {
    const baseMin = 2_000_000n
    const swapFee = 40_000n
    const effectiveFeeRate = 0.003

    const result = calculateMinimumStakeInput(baseMin, swapFee, effectiveFeeRate)

    expect(result).toBeGreaterThan(2_046_000n)
    expect(result).toBeLessThan(2_047_000n)
  })

  test("larger fee rate requires larger minimum input", () => {
    const baseMin = 2_000_000n
    const swapFee = 40_000n

    const result003 = calculateMinimumStakeInput(baseMin, swapFee, 0.003)
    const result005 = calculateMinimumStakeInput(baseMin, swapFee, 0.005)

    expect(result005).toBeGreaterThan(result003)
  })

  test("Seek discount reduces required minimum", () => {
    const baseMin = 2_000_000n
    const swapFee = 40_000n

    const noDiscount = calculateMinimumStakeInput(baseMin, swapFee, 0.003)
    const halfDiscount = calculateMinimumStakeInput(baseMin, swapFee, 0.0015)
    const fullDiscount = calculateMinimumStakeInput(baseMin, swapFee, 0)

    expect(noDiscount).toBeGreaterThan(halfDiscount)
    expect(halfDiscount).toBeGreaterThan(fullDiscount)
    expect(fullDiscount).toEqual(2_040_000n)
  })

  test("throws error when fee rate is 100% or more", () => {
    const baseMin = 2_000_000n
    expect(() => calculateMinimumStakeInput(baseMin, 0n, 1)).toThrow(
      "Effective fee rate must be less than 100%",
    )
    expect(() => calculateMinimumStakeInput(baseMin, 0n, 1.5)).toThrow(
      "Effective fee rate must be less than 100%",
    )
  })

  test("handles realistic Bittensor scenario", () => {
    const minTaoStake = 2_000_000n
    const swapFee = 40_000n
    const effectiveFeeRate = 0.003

    const minInput = calculateMinimumStakeInput(minTaoStake, swapFee, effectiveFeeRate)

    expect(minInput).toBeGreaterThan(minTaoStake + swapFee)

    const afterTalismanFee = (minInput * 9970n) / 10000n
    const afterSwapFee = afterTalismanFee - swapFee

    expect(afterSwapFee).toBeGreaterThanOrEqual(minTaoStake - 1n)
  })
})
