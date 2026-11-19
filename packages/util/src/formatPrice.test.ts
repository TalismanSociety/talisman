import { describe, expect, it } from "vitest"
import { formatCompactPrice, formatPrice } from "./formatPrice"

describe("formatPrice", () => {
  it("works", () => {
    expect(formatPrice(0.0000001, "usd", true)).toEqual("$0.000000100")
    expect(formatPrice(0.0000001, "usd", false)).toEqual("$0.000000100")
    expect(formatPrice(1, "usd", true)).toEqual("$1.00")
    expect(formatPrice(1, "usd", false)).toEqual("$1.00")
    expect(formatPrice(97156.156156485, "usd", true)).toEqual("$97.16K")
    expect(formatPrice(97156.156156485, "usd", false)).toEqual("$97,156.156156485")
    expect(formatPrice(609.325645498, "usd", true)).toEqual("$609.3")
    expect(formatPrice(609.325645498, "usd", false)).toEqual("$609.325645498")
    expect(formatPrice(609.325645498, "eth", true)).toEqual("Ξ609.3")
    expect(formatPrice(609.325645498, "eth", false)).toEqual("Ξ609.325645498")
    expect(formatPrice(0.00518, "tao", true)).toEqual("τ0.00518")
    expect(formatPrice(1234.5678, "tao", true)).toEqual("τ1.235K")
    expect(formatPrice(0.0000001, "btc", false)).toEqual("₿0.000000100")
    expect(formatPrice(1, "btc", true)).toEqual("₿1.00")
    expect(formatPrice(1.5, "btc", false)).toEqual("₿1.50")
    expect(formatPrice(0.00518, "btc", true)).toEqual("₿0.00518")
    expect(formatPrice(97156.156156485, "btc", true)).toEqual("₿97.16K")
    expect(formatPrice(97156.156156485, "btc", false)).toEqual("₿97,156.156156485")
  })
})

describe("formatCompactPrice", () => {
  it("collapses a run of at least 4 leading fraction zeros", () => {
    expect(formatCompactPrice(0.000003844, "usd")).toEqual({
      kind: "collapsedZeros",
      head: "$0.",
      zeroCount: 5,
      tail: "384",
    })
    expect(formatCompactPrice(0.00001234, "usd")).toEqual({
      kind: "collapsedZeros",
      head: "$0.",
      zeroCount: 4,
      tail: "123",
    })
  })

  it("drops trailing zeros after the collapsed run", () => {
    expect(formatCompactPrice(0.0000001, "usd")).toEqual({
      kind: "collapsedZeros",
      head: "$0.",
      zeroCount: 6,
      tail: "1",
    })
  })

  it("keeps the currency symbol of crypto currencies", () => {
    expect(formatCompactPrice(0.00000057, "eth")).toEqual({
      kind: "collapsedZeros",
      head: "Ξ0.",
      zeroCount: 6,
      tail: "57",
    })
  })

  it("counts zeros after rounding", () => {
    expect(formatCompactPrice(0.000009999, "usd")).toEqual({
      kind: "collapsedZeros",
      head: "$0.",
      zeroCount: 4,
      tail: "1",
    })
  })

  it("leaves shorter zero runs, zero and prices above 1 as formatPrice renders them", () => {
    for (const price of [0.000123, 0, 1, 609.325645498, 97156.156156485])
      expect(formatCompactPrice(price, "usd")).toEqual({
        kind: "plain",
        text: formatPrice(price, "usd", true),
      })
  })
})
