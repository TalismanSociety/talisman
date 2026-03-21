import { describe, expect, it } from "vitest"

import { getSearchTerms, matchesSearchTerms } from "../tokenSearch"

describe("getSearchTerms", () => {
  it("normalizes and splits whitespace-separated terms", () => {
    expect(getSearchTerms("  DOT   relay-chain  ")).toEqual(["dot", "relay-chain"])
  })
})

describe("matchesSearchTerms", () => {
  it("returns true when there are no search terms", () => {
    expect(matchesSearchTerms([], ["DOT", "Polkadot", "Relay Chain"])).toBe(true)
  })

  it("matches when all terms exist across searchable values", () => {
    const searchTerms = getSearchTerms("dot relay")

    expect(matchesSearchTerms(searchTerms, ["DOT", "Polkadot", "Relay Chain"])).toBe(true)
  })

  it("returns false when one or more terms are missing", () => {
    const searchTerms = getSearchTerms("dot avalanche")

    expect(matchesSearchTerms(searchTerms, ["DOT", "Polkadot", "Relay Chain"])).toBe(false)
  })

  it("ignores empty searchable values", () => {
    const searchTerms = getSearchTerms("dot relay")

    expect(matchesSearchTerms(searchTerms, ["DOT", null, undefined, "Relay Chain"])).toBe(true)
  })
})
