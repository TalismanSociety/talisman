import { describe, expect, it } from "vitest"

import { parseUserInputToPlanck, parseUserInputToPlanckOrUndefined } from "../swap-utils"

describe("parseUserInputToPlanck", () => {
  it("parses zero", () => {
    expect(parseUserInputToPlanck("0", 18)).toBe(0n)
  })

  it("parses whole number", () => {
    expect(parseUserInputToPlanck("1", 18)).toBe(1_000_000_000_000_000_000n)
  })

  it("parses decimal value", () => {
    expect(parseUserInputToPlanck("0.1", 18)).toBe(100_000_000_000_000_000n)
  })

  it("parses trailing decimal point (e.g. '0.')", () => {
    expect(parseUserInputToPlanck("0.", 18)).toBe(0n)
    expect(parseUserInputToPlanck("5.", 18)).toBe(5_000_000_000_000_000_000n)
  })

  it("parses complex decimal", () => {
    expect(parseUserInputToPlanck("1.001", 18)).toBe(1_001_000_000_000_000_000n)
  })

  it("truncates fractional digits exceeding decimals", () => {
    // 4 decimals: "1.123456" → "1.1234" → 11234n
    expect(parseUserInputToPlanck("1.123456", 4)).toBe(11234n)
  })

  it("handles zero decimals", () => {
    expect(parseUserInputToPlanck("42", 0)).toBe(42n)
  })

  it("strips trailing zeros in fractional part", () => {
    // "1.10" → whole "1", fractional "1" (trailing 0 stripped)
    expect(parseUserInputToPlanck("1.10", 18)).toBe(1_100_000_000_000_000_000n)
  })

  it("throws on invalid character", () => {
    expect(() => parseUserInputToPlanck("1.2a", 18)).toThrow("Invalid character")
  })

  it("throws on multiple decimal points", () => {
    expect(() => parseUserInputToPlanck("1.2.3", 18)).toThrow("More than one separator")
  })
})

describe("parseUserInputToPlanckOrUndefined", () => {
  it("returns bigint for valid input", () => {
    expect(parseUserInputToPlanckOrUndefined("0.1", 18)).toBe(100_000_000_000_000_000n)
  })

  it("returns undefined for invalid input", () => {
    expect(parseUserInputToPlanckOrUndefined("abc", 18)).toBeUndefined()
  })

  it("returns 0n for '0'", () => {
    expect(parseUserInputToPlanckOrUndefined("0", 18)).toBe(0n)
  })
})
