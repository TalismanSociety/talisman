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
})
