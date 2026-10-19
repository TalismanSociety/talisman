import { describe, expect, it } from "vitest"

import { getSwapFormState, type SwapFormInputs } from "../swapFormState"

const READY: SwapFormInputs = {
  fromTokenId: "from",
  toTokenId: "to",
  fromAmount: 100n,
  isQuoteDataCurrent: true,
  quoteCount: 2,
  transferable: 100n,
  gasBuffer: 0n,
}

describe("getSwapFormState", () => {
  it.each<[string, Partial<SwapFormInputs>, ReturnType<typeof getSwapFormState>]>([
    ["every input is set", {}, "ready"],
    ["the from token is missing", { fromTokenId: null, fromAmount: null }, "no_tokens"],
    ["the to token is missing", { toTokenId: null, quoteCount: 0 }, "no_tokens"],
    ["the amount is missing", { fromAmount: null, quoteCount: 0 }, "no_amount"],
    ["the amount is zero", { fromAmount: 0n, quoteCount: 0 }, "no_amount"],
    [
      "quotes for these inputs have not settled",
      { isQuoteDataCurrent: false, quoteCount: 0 },
      "quoting",
    ],
    ["quotes are for older inputs", { isQuoteDataCurrent: false, transferable: 1n }, "quoting"],
    ["no provider quoted", { quoteCount: 0, transferable: 1n }, "no_quote"],
    ["the amount is above the balance", { transferable: 99n }, "insufficient_balance"],
    ["the gas buffer is above the rest", { gasBuffer: 1n }, "insufficient_balance"],
    ["the balance is unknown", { transferable: null }, "ready"],
  ])("%s", (_, inputs, expected) => {
    expect(getSwapFormState({ ...READY, ...inputs })).toBe(expected)
  })
})
