import { isValidSubstrateAddress } from "./isValidSubstrateAddress"

describe("isValidSubstrateAddress", () => {
  it("should return true for a valid address without prefix", () => {
    const result = isValidSubstrateAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
    expect(result).toBe(true)
  })

  it("should return false for an invalid address", () => {
    const result = isValidSubstrateAddress("invalidaddresstest")
    expect(result).toBe(false)
  })

  it("should return true for a valid address with a matching prefix", () => {
    const result = isValidSubstrateAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 42)
    expect(result).toBe(true)
  })

  it("should return false for a valid address with a non-matching prefix", () => {
    const result = isValidSubstrateAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 40)
    expect(result).toBe(false)
  })
})
