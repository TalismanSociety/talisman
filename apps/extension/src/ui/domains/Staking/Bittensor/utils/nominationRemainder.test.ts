import type { TFunction } from "i18next"
import { describe, expect, it } from "vitest"

import {
  formatUpperBound,
  getRemainderFloorPrice,
  getSweepableRemainder,
  getSweepableRemainderError,
} from "./nominationRemainder"

const position = { stake: 100n, maxAmount: 100n, minKeep: 20n, minAmount: 2n }

describe("getSweepableRemainder", () => {
  it("flags a partial amount that leaves less than the minimum, with the largest valid one", () => {
    expect(getSweepableRemainder({ ...position, amount: 90n })).toEqual({
      kind: "partial",
      maxPartial: 80n,
    })
  })

  it("accepts an amount that keeps exactly the minimum", () => {
    expect(getSweepableRemainder({ ...position, amount: 80n })).toBeNull()
  })

  it("accepts unstaking everything", () => {
    expect(getSweepableRemainder({ ...position, amount: 100n })).toBeNull()
  })

  it("accepts max when conviction locks keep the rest, which the chain sweeps to exit", () => {
    expect(getSweepableRemainder({ ...position, maxAmount: 90n, amount: 90n })).toBeNull()
  })

  it("accepts no amount", () => {
    expect(getSweepableRemainder({ ...position, amount: 0n })).toBeNull()
  })

  it("asks for a full exit when the position is too small for a partial amount", () => {
    expect(getSweepableRemainder({ ...position, stake: 21n, maxAmount: 21n, amount: 10n })).toEqual(
      { kind: "exit-only" }
    )
  })

  it("asks for a full exit when the minimum is the whole stake, even without an operation minimum", () => {
    expect(
      getSweepableRemainder({ stake: 20n, maxAmount: 20n, minKeep: 20n, minAmount: 0n, amount: 5n })
    ).toEqual({ kind: "exit-only" })
  })
})

describe("getRemainderFloorPrice", () => {
  const alphaPrice = 1_000_000_000n

  it("uses the unstake's limit price, which sits below spot at the same tolerance", () => {
    expect(getRemainderFloorPrice({ alphaPrice, slippage: 0.5, priceLimit: 980_000_000n })).toBe(
      980_000_000n
    )
  })

  it("uses spot at the slippage tolerance until the unstake is simulated", () => {
    expect(getRemainderFloorPrice({ alphaPrice, slippage: 0.5, priceLimit: null })).toBe(
      995_000_000n
    )
  })

  it("keeps the lower spot floor when a limit price comes out above it", () => {
    expect(getRemainderFloorPrice({ alphaPrice, slippage: 2, priceLimit: 990_000_000n })).toBe(
      980_000_000n
    )
  })

  it("floors at 1 rao at a 100% tolerance, so only a full exit is safe", () => {
    expect(getRemainderFloorPrice({ alphaPrice, slippage: 100, priceLimit: 0n })).toBe(1n)
  })
})

describe("formatUpperBound", () => {
  it("never rounds up", () => {
    expect(formatUpperBound(189_499_990n, 9)).toBe("0.1894")
  })

  it("never compacts, so the amount can be typed back", () => {
    expect(formatUpperBound(12_345_678_000_000n, 9)).toBe("12,340")
  })
})

describe("getSweepableRemainderError", () => {
  const t = ((key: string, values: Record<string, string>) =>
    key.replace(/{{(\w+)}}/g, (_, name: string) => values[name] ?? "")) as unknown as TFunction
  const tokens = {
    minTao: 20_000_000n,
    tao: { decimals: 9, symbol: "TAO" },
    alpha: { decimals: 9, symbol: "SN4" },
  }

  it("names the largest partial amount and fills it", () => {
    expect(
      getSweepableRemainderError(t, { kind: "partial", maxPartial: 189_453_899n }, tokens)
    ).toEqual({
      message:
        "Bittensor closes stakes worth less than 0.02 TAO. Unstake everything, or at most 0.1894 SN4.",
      category: "input_invalid",
      fillAmount: 189_453_899n,
    })
  })

  it("asks for a full exit with nothing to fill", () => {
    expect(getSweepableRemainderError(t, { kind: "exit-only" }, tokens)).toEqual({
      message: "Bittensor closes stakes worth less than 0.02 TAO. Unstake everything.",
      category: "input_invalid",
      fillAmount: null,
    })
  })
})
