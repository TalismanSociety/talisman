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

  it("returns a string", () => {
    expect(typeof deriveMiniMetadataId(base)).toBe("string")
  })

  describe("edge cases", () => {
    it("handles empty source", () => {
      const id = deriveMiniMetadataId({ source: "", chainId: "polkadot", specVersion: 1000000 })
      expect(id).toHaveLength(32)
      expect(id).toMatch(/^[0-9a-f]{32}$/)
    })

    it("handles empty chainId", () => {
      const id = deriveMiniMetadataId({
        source: "substrate-native",
        chainId: "",
        specVersion: 1000000,
      })
      expect(id).toHaveLength(32)
      expect(id).toMatch(/^[0-9a-f]{32}$/)
    })

    it("handles specVersion of 0", () => {
      const id = deriveMiniMetadataId({
        source: "substrate-native",
        chainId: "polkadot",
        specVersion: 0,
      })
      expect(id).toHaveLength(32)
      expect(id).toMatch(/^[0-9a-f]{32}$/)
    })

    it("handles very large specVersion (Number.MAX_SAFE_INTEGER)", () => {
      const id = deriveMiniMetadataId({
        source: "substrate-native",
        chainId: "polkadot",
        specVersion: Number.MAX_SAFE_INTEGER,
      })
      expect(id).toHaveLength(32)
      expect(id).toMatch(/^[0-9a-f]{32}$/)
    })

    it("handles special characters in chainId (hyphens, dots)", () => {
      const id1 = deriveMiniMetadataId({
        source: "substrate-native",
        chainId: "my-chain.v2",
        specVersion: 1,
      })
      const id2 = deriveMiniMetadataId({
        source: "substrate-native",
        chainId: "my.chain-v2",
        specVersion: 1,
      })
      expect(id1).toHaveLength(32)
      expect(id1).toMatch(/^[0-9a-f]{32}$/)
      expect(id2).toHaveLength(32)
      expect(id2).toMatch(/^[0-9a-f]{32}$/)
      expect(id1).not.toBe(id2)
    })

    it("handles unicode characters in source and chainId", () => {
      const id = deriveMiniMetadataId({ source: "源-native", chainId: "チェーン", specVersion: 1 })
      expect(id).toHaveLength(32)
      expect(id).toMatch(/^[0-9a-f]{32}$/)
    })
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

    it("distinguishes inputs where concatenation differs", () => {
      const id1 = deriveMiniMetadataId({
        source: "substrate-native",
        chainId: "polkadot",
        specVersion: 1,
      })
      const id2 = deriveMiniMetadataId({
        source: "substrate-tokens",
        chainId: "polkadot",
        specVersion: 1,
      })
      expect(id1).not.toBe(id2)
    })

    it("produces unique IDs for many different inputs", () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(deriveMiniMetadataId({ source: `source-${i}`, chainId: "chain", specVersion: i }))
      }
      expect(ids.size).toBe(100)
    })
  })
})
