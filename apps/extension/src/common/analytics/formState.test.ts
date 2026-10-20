import { describe, expect, it } from "vitest"

import { type AmountFormInputs, type AmountFormState, getAmountFormState } from "./formState"

const READY: AmountFormInputs = { amount: 100n, error: null, ready: true }

describe("getAmountFormState", () => {
  it.each<[string, Partial<AmountFormInputs>, AmountFormState]>([
    ["the user could go on", {}, "ready"],
    ["the amount is missing", { amount: null, ready: false }, "no_amount"],
    ["the amount is undefined", { amount: undefined, ready: false }, "no_amount"],
    ["the amount is zero", { amount: 0n }, "no_amount"],
    ["the amount is zero and the form shows an error", { amount: 0n, error: "rpc" }, "no_amount"],
    ["the wallet is still checking the amount", { ready: false }, "loading"],
    [
      "the amount is above the balance",
      { error: "insufficient_balance", ready: false },
      "insufficient_balance",
    ],
    [
      "the fee is above the balance",
      { error: "insufficient_fee", ready: false },
      "insufficient_fee",
    ],
    [
      "the gas is above the balance",
      { error: "insufficient_gas", ready: false },
      "insufficient_fee",
    ],
    ["the amount is under the minimum", { error: "below_minimum", ready: false }, "below_minimum"],
    ["the form shows another error", { error: "input_invalid", ready: false }, "invalid"],
    ["the form shows an error that did not block", { error: "unknown" }, "invalid"],
  ])("%s", (_, inputs, expected) => {
    expect(getAmountFormState({ ...READY, ...inputs })).toBe(expected)
  })
})
