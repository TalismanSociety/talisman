import { describe, expect, it } from "vitest"

import { isTokenIdInTypes, isTokenIdOfType } from "./utils"

describe("isTokenIdOfType", () => {
  it("matches a valid token id of the given type", () => {
    expect(isTokenIdOfType("bittensor:substrate-dtao:128", "substrate-dtao")).toBe(true)
    expect(isTokenIdOfType("bittensor:substrate-dtao:128:hotkey", "substrate-dtao")).toBe(true)
    expect(isTokenIdOfType("polkadot:substrate-native", "substrate-native")).toBe(true)
  })

  it("returns false for a valid token id of another type", () => {
    expect(isTokenIdOfType("polkadot:substrate-native", "substrate-dtao")).toBe(false)
  })

  it("returns false for unknown token types", () => {
    expect(isTokenIdOfType("somechain:bitcoin-native", "substrate-dtao")).toBe(false)
  })

  it("returns false for malformed ids instead of throwing", () => {
    expect(isTokenIdOfType("polkadot-substrate-native", "substrate-native")).toBe(false)
    expect(isTokenIdOfType("", "substrate-native")).toBe(false)
    expect(isTokenIdOfType("bittensor:substrate-dtao:not-a-netuid", "substrate-dtao")).toBe(false)
  })

  it("returns false for non-string values instead of throwing", () => {
    expect(isTokenIdOfType(null, "substrate-native")).toBe(false)
    expect(isTokenIdOfType(undefined, "substrate-native")).toBe(false)
    expect(isTokenIdOfType(42, "substrate-native")).toBe(false)
    expect(isTokenIdOfType({}, "substrate-native")).toBe(false)
  })
})

describe("isTokenIdInTypes", () => {
  it("matches any of the given types", () => {
    expect(
      isTokenIdInTypes("bittensor:substrate-dtao:128", ["substrate-native", "substrate-dtao"])
    ).toBe(true)
    expect(isTokenIdInTypes("bittensor:substrate-dtao:128", ["substrate-native"])).toBe(false)
    expect(isTokenIdInTypes("garbage", ["substrate-native", "substrate-dtao"])).toBe(false)
  })
})
