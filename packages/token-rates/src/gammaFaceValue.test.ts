import { describe, expect, it } from "vitest"

import { getGammaFaceValue } from "./gammaFaceValue"
import { newTokenRates, type TokenRatesList } from "./types"

const TAO = "bittensor:substrate-native"

const rates: TokenRatesList = {
  [TAO]: {
    ...newTokenRates(),
    usd: { price: 300 },
    aud: { price: 450 },
    tao: { price: 1 },
  },
}

describe("getGammaFaceValue", () => {
  it("converts the USD face value with the TAO cross rate", () => {
    expect(getGammaFaceValue(rates, TAO, "aud")).toEqual({
      kind: "gamma-face-value",
      currency: "aud",
      perGamma: 1.5,
    })
  })

  it("is exactly 1 in USD", () => {
    expect(getGammaFaceValue(rates, TAO, "usd")).toEqual({
      kind: "gamma-face-value",
      currency: "usd",
      perGamma: 1,
    })
  })

  it("is the inverse of the TAO price in TAO", () => {
    expect(getGammaFaceValue(rates, TAO, "tao")?.perGamma).toBe(1 / 300)
  })

  it("is null when TAO has no USD rate", () => {
    const noUsd: TokenRatesList = { [TAO]: { ...rates[TAO]!, usd: null } }
    expect(getGammaFaceValue(noUsd, TAO, "aud")).toBeNull()
    expect(getGammaFaceValue(rates, TAO, "aud")).not.toBeNull()
  })

  it("is null when TAO is worth 0 USD", () => {
    const zeroUsd: TokenRatesList = { [TAO]: { ...rates[TAO]!, usd: { price: 0 } } }
    expect(getGammaFaceValue(zeroUsd, TAO, "aud")).toBeNull()
  })

  it("is null when TAO has no rate in the currency", () => {
    expect(getGammaFaceValue(rates, TAO, "eur")).toBeNull()
    expect(getGammaFaceValue(rates, TAO, "aud")?.perGamma).toBe(1.5)
  })

  it("is null when TAO has no rates at all", () => {
    expect(getGammaFaceValue({}, TAO, "aud")).toBeNull()
    expect(getGammaFaceValue(rates, TAO, "aud")?.perGamma).toBe(1.5)
  })
})
