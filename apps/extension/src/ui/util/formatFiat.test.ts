import { describe, expect, it } from "vitest"
import { formatFiat } from "./formatFiat"

describe("formatFiat", () => {
  it("uses the τ symbol for TAO values", () => {
    expect(formatFiat(1234.5678, { currency: "tao", minimumDecimalPlaces: 2 })).toEqual("τ1,234.57")
  })

  it("puts the TAO code after the value in code display", () => {
    expect(
      formatFiat(3.19, { currency: "tao", currencyDisplay: "code", minimumDecimalPlaces: 2 })
    ).toEqual("3.19 TAO")
  })
})
