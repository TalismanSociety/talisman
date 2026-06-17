import { describe, expect, it } from "vitest"

import BigNumber from "./configureBigNumber"

describe("configureBigNumber", () => {
  // bignumber.js v10+ throws on invalid input by default. We disable STRICT to
  // preserve the v9 behaviour of returning NaN. Guard against accidental removal.
  it("returns NaN for invalid input instead of throwing", () => {
    expect(() => new BigNumber("not-a-number")).not.toThrow()
    expect(new BigNumber("not-a-number").isNaN()).toBe(true)

    expect(() => new BigNumber("")).not.toThrow()
    expect(new BigNumber("").isNaN()).toBe(true)
  })

  it("still parses valid input normally", () => {
    expect(new BigNumber("1.5").toString(10)).toBe("1.5")
  })
})
