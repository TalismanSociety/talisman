import { planckToTokens } from "./planckToTokens"

describe("planckToTokens", () => {
  it("should correctly convert planck to tokens with given decimals", () => {
    expect(planckToTokens("1000000", 6)).toBe("1")
    expect(planckToTokens("123456789", 8)).toBe("1.23456789")
  })

  it("should return undefined if planck is not a string", () => {
    expect(planckToTokens(1000000000 as unknown as string, 18)).toBeUndefined()
  })

  it("should return undefined if tokenDecimals is not a number", () => {
    expect(planckToTokens("1000000000", "18" as unknown as number)).toBeUndefined()
  })

  it("should handle missing tokenDecimals", () => {
    expect(planckToTokens("1000000000")).toBeUndefined()
  })

  it("should handle missing planck", () => {
    expect(planckToTokens(undefined, 18)).toBeUndefined()
  })

  it("should handle invalid planck input", () => {
    expect(planckToTokens("abc", 18)).toBe("NaN")
  })
})
