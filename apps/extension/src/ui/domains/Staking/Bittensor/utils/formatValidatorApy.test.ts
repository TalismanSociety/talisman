import { describe, expect, it } from "vitest"

import { formatValidatorApy } from "./formatValidatorApy"

describe("formatValidatorApy", () => {
  it("returns null when the APY is unknown", () => {
    expect(formatValidatorApy(null)).toBeNull()
    expect(formatValidatorApy(undefined)).toBeNull()
  })

  it("formats a validator without rewards as 0.00%", () => {
    expect(formatValidatorApy(0)).toBe("0.00%")
  })

  it("formats a positive APY as a percentage", () => {
    expect(formatValidatorApy(0.346)).toBe("34.60%")
  })
})
