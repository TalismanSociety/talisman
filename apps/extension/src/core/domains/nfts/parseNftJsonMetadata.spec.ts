import { describe, expect, it } from "vitest"

import { parseNftJsonMetadata } from "./parseNftJsonMetadata"

describe("parseNftJsonMetadata", () => {
  it.each([null, "a string", 42, [{ name: "x" }]])("rejects %j", (value) => {
    expect(parseNftJsonMetadata(value)).toBeNull()
  })

  it("keeps known fields of the expected type and usable attributes", () => {
    expect(
      parseNftJsonMetadata({
        name: "Item",
        description: 12,
        image: "ipfs://x",
        animation_url: null,
        external_url: "https://example.com",
        attributes: [
          { trait_type: "Colour", value: "Red" },
          { trait_type: "Level", value: 2 },
          { trait_type: "Nested", value: { a: 1 } },
          { value: "no type" },
          "junk",
        ],
      })
    ).toEqual({
      name: "Item",
      image: "ipfs://x",
      external_url: "https://example.com",
      attributes: [
        { trait_type: "Colour", value: "Red" },
        { trait_type: "Level", value: 2 },
      ],
    })
  })

  it("truncates oversized text and attribute lists", () => {
    const parsed = parseNftJsonMetadata({
      name: "n".repeat(250),
      description: "d".repeat(2500),
      attributes: Array.from({ length: 60 }, (_, i) => ({
        trait_type: `t${i}`.padEnd(150, "x"),
        value: "v".repeat(150),
      })),
    })

    expect(parsed?.name).toHaveLength(200)
    expect(parsed?.description).toHaveLength(2000)
    expect(parsed?.attributes).toHaveLength(50)
    expect(parsed?.attributes?.[0].trait_type).toHaveLength(100)
    expect(parsed?.attributes?.[0].value).toHaveLength(100)
    expect(parsed?.attributes?.[49].trait_type.startsWith("t49")).toBe(true)
  })

  it("reads attributes under the traits key", () => {
    expect(parseNftJsonMetadata({ traits: [{ trait_type: "Eyes", value: true }] })).toEqual({
      attributes: [{ trait_type: "Eyes", value: true }],
    })
  })
})
