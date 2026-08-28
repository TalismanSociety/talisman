import { describe, expect, it } from "vitest"

import {
  assertDepositAmountWithinInput,
  assertNativeValueWithinInput,
} from "../provider-transaction-guards"

describe("assertDepositAmountWithinInput", () => {
  // 1.5 tokens with 18 decimals
  const fromAmount = 1_500_000_000_000_000_000n
  const decimals = 18

  it("accepts the exact amount the user entered", () => {
    expect(() =>
      assertDepositAmountWithinInput({ depositAmount: 1.5, fromAmount, decimals })
    ).not.toThrow()
  })

  it("accepts a smaller amount", () => {
    expect(() =>
      assertDepositAmountWithinInput({ depositAmount: 1.4999, fromAmount, decimals })
    ).not.toThrow()
  })

  it("rejects an amount larger than the user entered", () => {
    expect(() =>
      assertDepositAmountWithinInput({ depositAmount: 1.500001, fromAmount, decimals })
    ).toThrow("Quote changed")
  })

  it("rejects a wildly larger amount", () => {
    expect(() =>
      assertDepositAmountWithinInput({ depositAmount: 1000, fromAmount, decimals })
    ).toThrow("Quote changed")
  })

  it("rejects a non-numeric amount instead of comparing false", () => {
    expect(() =>
      assertDepositAmountWithinInput({ depositAmount: "not a number", fromAmount, decimals })
    ).toThrow("Quote changed")
  })

  it("rejects NaN and Infinity", () => {
    expect(() =>
      assertDepositAmountWithinInput({ depositAmount: Number.NaN, fromAmount, decimals })
    ).toThrow("Quote changed")
    expect(() =>
      assertDepositAmountWithinInput({
        depositAmount: Number.POSITIVE_INFINITY,
        fromAmount,
        decimals,
      })
    ).toThrow("Quote changed")
  })

  it("rejects a negative amount", () => {
    expect(() =>
      assertDepositAmountWithinInput({ depositAmount: -1, fromAmount, decimals })
    ).toThrow("Quote changed")
  })

  it("compares against the user amount at full precision", () => {
    // 6 decimals — a value one unit above the input must not survive float rounding
    expect(() =>
      assertDepositAmountWithinInput({
        depositAmount: "1000.000001",
        fromAmount: 1_000_000_000n,
        decimals: 6,
      })
    ).toThrow("Quote changed")
  })
})

describe("assertNativeValueWithinInput", () => {
  const fromAmount = 1_000_000_000_000_000_000n

  it("accepts a native swap spending exactly the entered amount", () => {
    expect(() =>
      assertNativeValueWithinInput({ value: fromAmount, fromAmount, isNativeInput: true })
    ).not.toThrow()
  })

  it("accepts a native swap spending less", () => {
    expect(() =>
      assertNativeValueWithinInput({ value: fromAmount - 1n, fromAmount, isNativeInput: true })
    ).not.toThrow()
  })

  it("rejects a native swap spending more than the entered amount", () => {
    expect(() =>
      assertNativeValueWithinInput({ value: fromAmount + 1n, fromAmount, isNativeInput: true })
    ).toThrow("Unexpected transaction amount")
  })

  it("accepts an erc20 swap carrying no native value", () => {
    expect(() =>
      assertNativeValueWithinInput({ value: 0n, fromAmount, isNativeInput: false })
    ).not.toThrow()
  })

  it("rejects an erc20 swap carrying any native value", () => {
    expect(() =>
      assertNativeValueWithinInput({ value: 1n, fromAmount, isNativeInput: false })
    ).toThrow("Unexpected transaction amount")
  })
})
