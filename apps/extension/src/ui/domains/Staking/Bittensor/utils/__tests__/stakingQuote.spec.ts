import { describe, expect, test } from "vitest"
import {
  getMinimumStakeInput,
  getPoolInput,
  getStakingQuoteMath,
  getSubnetFeePercent,
} from "../stakingQuote"

const ONE_TAO = 1_000_000_000n

const simulation = {
  tao_amount: ONE_TAO,
  alpha_amount: 50n * ONE_TAO,
  tao_fee: 500_000n,
  alpha_fee: 0n,
}

describe("getSubnetFeePercent", () => {
  const fee = { buy: { "64": 0.1 }, sell: { "64": 0 } }

  test("defaults to 0.3% on a subnet without an override", () => {
    expect(getSubnetFeePercent(fee, 1, "taoToAlpha")).toBe(0.3)
    expect(getSubnetFeePercent(fee, 1, "alphaToTao")).toBe(0.3)
    expect(getSubnetFeePercent({ buy: null, sell: null }, 64, "taoToAlpha")).toBe(0.3)
  })

  test("reads the buy override for a stake and the sell override for an unstake", () => {
    expect(getSubnetFeePercent(fee, 64, "taoToAlpha")).toBe(0.1)
    expect(getSubnetFeePercent(fee, 64, "alphaToTao")).toBe(0)
  })
})

describe("getPoolInput", () => {
  const terms = { feePercent: 0.3, seekDiscount: 0, amountIn: ONE_TAO }

  test("takes the Talisman fee off a subnet stake", () => {
    expect(getPoolInput({ ...terms, direction: "taoToAlpha", netuid: 64 })).toBe(997_000_000n)
  })

  test("takes a discounted fee off for a SEEK staker", () => {
    expect(getPoolInput({ ...terms, seekDiscount: 0.5, direction: "taoToAlpha", netuid: 64 })).toBe(
      998_500_000n
    )
  })

  test("passes an unstake and a root stake through whole", () => {
    expect(getPoolInput({ ...terms, direction: "alphaToTao", netuid: 64 })).toBe(ONE_TAO)
    expect(getPoolInput({ ...terms, direction: "taoToAlpha", netuid: 0 })).toBe(ONE_TAO)
  })
})

describe("getStakingQuoteMath", () => {
  const terms = { feePercent: 0.3, seekDiscount: 0, simulation, alphaPrice: 20_000_000n }

  test("a stake pays the fee on its input and receives the simulated alpha", () => {
    const math = getStakingQuoteMath({
      ...terms,
      direction: "taoToAlpha",
      amountIn: ONE_TAO,
      slippage: 0.005,
    })

    expect(math).toEqual({
      talismanFee: 3_000_000n,
      amountOut: 50n * ONE_TAO,
      swapPrice: 20_000_000n,
      priceLimit: 20_100_000n,
      priceImpact: 0,
    })
  })

  test("an unstake pays the fee out of the simulated TAO", () => {
    const math = getStakingQuoteMath({
      ...terms,
      direction: "alphaToTao",
      amountIn: 50n * ONE_TAO,
      slippage: 0.005,
    })

    expect(math.talismanFee).toBe(3_000_000n)
    expect(math.amountOut).toBe(997_000_000n)
    expect(math.priceLimit).toBe(19_900_000n)
  })

  test("the price limit equals the swap price without slippage", () => {
    const math = getStakingQuoteMath({
      ...terms,
      direction: "taoToAlpha",
      amountIn: ONE_TAO,
      slippage: 0,
    })

    expect(math.priceLimit).toBe(math.swapPrice)
  })

  test("reports how far the trade's price is from the spot price, in percent", () => {
    const quote = (direction: "taoToAlpha" | "alphaToTao", alphaPrice: bigint | null) =>
      getStakingQuoteMath({ ...terms, alphaPrice, direction, amountIn: ONE_TAO, slippage: 0 })

    expect(quote("taoToAlpha", 19_800_000n).priceImpact).toBe(1.01)
    expect(quote("alphaToTao", 25_000_000n).priceImpact).toBe(-20)
    expect(quote("taoToAlpha", null).priceImpact).toBeNull()
  })

  test("an empty simulation gives no price", () => {
    const math = getStakingQuoteMath({
      ...terms,
      simulation: { tao_amount: 0n, alpha_amount: 0n, tao_fee: 0n, alpha_fee: 0n },
      direction: "taoToAlpha",
      amountIn: ONE_TAO,
      slippage: 0.005,
    })

    expect(math).toMatchObject({ amountOut: 0n, swapPrice: 0n, priceLimit: 0n, priceImpact: null })
  })
})

describe("getMinimumStakeInput", () => {
  const args = { baseMinimum: 2_000_000n, minStakeSimulation: simulation, effectiveFeeRate: 0.003 }

  test("adds the pool fee and grosses up for the Talisman fee on a subnet", () => {
    expect(getMinimumStakeInput({ ...args, netuid: 64 })).toBe(2_507_522n)
  })

  test("root pays neither fee", () => {
    expect(getMinimumStakeInput({ ...args, netuid: 0, minStakeSimulation: null })).toBe(2_000_000n)
  })

  test("is unknown until the chain minimum and the simulation are", () => {
    expect(getMinimumStakeInput({ ...args, netuid: 64, minStakeSimulation: null })).toBeNull()
    expect(getMinimumStakeInput({ ...args, netuid: 64, baseMinimum: null })).toBeNull()
  })
})
