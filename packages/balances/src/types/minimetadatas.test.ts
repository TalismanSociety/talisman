import { describe, expect, it } from "vitest"
import { deriveMiniMetadataId } from "./minimetadatas"

describe("deriveMiniMetadataId", () => {
  const base = { source: "substrate-native", chainId: "polkadot", specVersion: 1000000 }

  it("returns a 32-character hex string", () => {
    const id = deriveMiniMetadataId(base)
    expect(id).toHaveLength(32)
    expect(id).toMatch(/^[0-9a-f]{32}$/)
  })

  it("is deterministic (same inputs produce same output)", () => {
    expect(deriveMiniMetadataId(base)).toBe(deriveMiniMetadataId(base))
  })

  it("produces different output for different source", () => {
    const alt = { ...base, source: "substrate-tokens" }
    expect(deriveMiniMetadataId(alt)).not.toBe(deriveMiniMetadataId(base))
  })

  it("produces different output for different chainId", () => {
    const alt = { ...base, chainId: "kusama" }
    expect(deriveMiniMetadataId(alt)).not.toBe(deriveMiniMetadataId(base))
  })

  it("produces different output for different specVersion", () => {
    const alt = { ...base, specVersion: 9999 }
    expect(deriveMiniMetadataId(alt)).not.toBe(deriveMiniMetadataId(base))
  })

  describe("collision resistance", () => {
    it("documents concatenation ambiguity (no field delimiter between source+chainId)", () => {
      // Known limitation: ID derivation concatenates fields without delimiters,
      // so inputs like ("ab","cd") and ("abc","d") hash identically.
      // This test documents the behavior — if a delimiter is added in future,
      // this test should be updated to expect distinct IDs.
      const id1 = deriveMiniMetadataId({ source: "ab", chainId: "cd", specVersion: 1 })
      const id2 = deriveMiniMetadataId({ source: "abc", chainId: "d", specVersion: 1 })
      // Currently these collide — when fixed, change to .not.toBe(id2)
      expect(id1).toBe(id2)
    })
  })
})
