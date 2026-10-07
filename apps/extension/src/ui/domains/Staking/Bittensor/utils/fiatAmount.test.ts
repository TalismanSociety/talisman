import { ALPHA_PRICE_SCALE } from "@talismn/balances"
import { describe, expect, it } from "vitest"

import { amountToFiat, fiatToAmount } from "./fiatAmount"

const TAO = { fiatPrice: 300, decimals: 9, taoPerUnit: ALPHA_PRICE_SCALE }
const ALPHA_AT_HALF_TAO = { ...TAO, taoPerUnit: ALPHA_PRICE_SCALE / 2n }

describe("fiatToAmount", () => {
  it("converts fiat to TAO plancks when the amount is in TAO", () => {
    expect(fiatToAmount("30", TAO)).toBe(100_000_000n)
  })

  it("divides by the alpha price when the amount is in alpha", () => {
    expect(fiatToAmount("30", ALPHA_AT_HALF_TAO)).toBe(200_000_000n)
  })

  it("returns null when the fiat cannot be converted", () => {
    expect(fiatToAmount("", ALPHA_AT_HALF_TAO)).toBeNull()
  })
})

describe("amountToFiat", () => {
  it("values an alpha amount at the alpha price", () => {
    expect(amountToFiat(200_000_000n, ALPHA_AT_HALF_TAO)).toBe("30")
  })

  it("gives back the fiat that was typed", () => {
    for (const fiat of ["100", "0.05", "13.37"]) {
      const amount = fiatToAmount(fiat, { ...TAO, taoPerUnit: 6_583_211n })
      expect(amount).not.toBeNull()
      expect(amountToFiat(amount as bigint, { ...TAO, taoPerUnit: 6_583_211n })).toBe(fiat)
    }
  })
})
