import { describe, expect, it } from "vitest"

import { fiatToPlancks } from "./fiatToPlancks"

const TAO_DECIMALS = 9
const TAO_PRICE = 300

describe("fiatToPlancks", () => {
  it("converts a fiat amount to plancks of the token", () => {
    expect(fiatToPlancks("50", TAO_PRICE, TAO_DECIMALS)).toBe(166_666_667n)
  })

  it("keeps amounts worth less than a thousandth of a token", () => {
    expect(fiatToPlancks("0.05", TAO_PRICE, TAO_DECIMALS)).toBe(166_667n)
  })

  it("returns null when there is nothing to convert", () => {
    expect(fiatToPlancks("", TAO_PRICE, TAO_DECIMALS)).toBeNull()
    expect(fiatToPlancks("  ", TAO_PRICE, TAO_DECIMALS)).toBeNull()
    expect(fiatToPlancks("abc", TAO_PRICE, TAO_DECIMALS)).toBeNull()
    expect(fiatToPlancks("-1", TAO_PRICE, TAO_DECIMALS)).toBeNull()
    expect(fiatToPlancks("1", 0, TAO_DECIMALS)).toBeNull()
  })

  it("returns null when the amount overflows", () => {
    expect(fiatToPlancks("1e308", 0.0039, TAO_DECIMALS)).toBeNull()
  })
})
