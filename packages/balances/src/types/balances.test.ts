import { describe, expect, it } from "vitest"
import { Balance, Balances, type HydrateDb } from "./balances"
import type { BalanceJson, BalanceJsonList, IBalance } from "./balancetypes"

/** Helper to create a minimal BalanceJson for testing */
function makeBalanceJson(
  overrides: Partial<IBalance> & { address: string; tokenId: string }
): BalanceJson {
  return {
    source: "test-source",
    status: "live",
    networkId: "test-network",
    value: "1000000000000",
    ...overrides,
  } as BalanceJson
}

function makeBalance(address: string, tokenId: string, value = "1000000000000"): Balance {
  return new Balance(makeBalanceJson({ address, tokenId, value }))
}

describe("Balances", () => {
  describe("constructor", () => {
    it("creates from Balance[]", () => {
      const b1 = makeBalance("0x01", "token-a")
      const b2 = makeBalance("0x02", "token-b")
      const balances = new Balances([b1, b2])

      expect(balances.count).toBe(2)
    })

    it("creates from empty array", () => {
      const balances = new Balances([])
      expect(balances.count).toBe(0)
    })

    it("creates from single Balance", () => {
      const b = makeBalance("0x01", "token-a")
      const balances = new Balances(b)
      expect(balances.count).toBe(1)
    })

    it("creates from Balances instance", () => {
      const original = new Balances([
        makeBalance("0x01", "token-a"),
        makeBalance("0x02", "token-b"),
      ])
      const copy = new Balances(original)

      expect(copy.count).toBe(2)
      expect(copy.get("0x01::token-a")).toBeTruthy()
      expect(copy.get("0x02::token-b")).toBeTruthy()
    })

    it("creates from BalanceJson[]", () => {
      const jsons = [
        makeBalanceJson({ address: "0x01", tokenId: "token-a" }),
        makeBalanceJson({ address: "0x02", tokenId: "token-b" }),
      ]
      const balances = new Balances(jsons)
      expect(balances.count).toBe(2)
    })

    it("creates from BalanceJsonList (Record<string, BalanceJson>)", () => {
      const list: BalanceJsonList = {
        "0x01::token-a": makeBalanceJson({ address: "0x01", tokenId: "token-a" }),
        "0x02::token-b": makeBalanceJson({ address: "0x02", tokenId: "token-b" }),
      }
      const balances = new Balances(list)
      expect(balances.count).toBe(2)
    })

    it("deduplicates by id (last wins)", () => {
      const b1 = new Balance(makeBalanceJson({ address: "0x01", tokenId: "token-a", value: "100" }))
      const b2 = new Balance(makeBalanceJson({ address: "0x01", tokenId: "token-a", value: "200" }))
      const balances = new Balances([b1, b2])

      // Map keeps last inserted for same key
      const found = balances.get("0x01::token-a")
      expect(found).toBeTruthy()
      expect(found!.toJSON().value).toBe("200")
    })
  })

  describe("get(id)", () => {
    it("returns Balance when found", () => {
      const b = makeBalance("0x01", "token-a")
      const balances = new Balances([b])
      const found = balances.get("0x01::token-a")
      expect(found).toBeTruthy()
      expect(found!.id).toBe("0x01::token-a")
    })

    it("returns null when not found", () => {
      const balances = new Balances([makeBalance("0x01", "token-a")])
      expect(balances.get("nonexistent")).toBeNull()
    })
  })

  describe("find()", () => {
    const b1 = makeBalance("0x01", "token-a")
    const b2 = makeBalance("0x02", "token-b")
    const b3 = makeBalance("0x01", "token-b")

    it("finds by object query", () => {
      const balances = new Balances([b1, b2, b3])
      const result = balances.find({ address: "0x01" })
      expect(result.count).toBe(2)
    })

    it("finds by function query", () => {
      const balances = new Balances([b1, b2, b3])
      const result = balances.find((b) => b.tokenId === "token-b")
      expect(result.count).toBe(2)
    })

    it("finds multiple matches", () => {
      const balances = new Balances([b1, b2, b3])
      const result = balances.find({ address: "0x01" })
      expect(result.count).toBe(2)
    })

    it("returns empty Balances when no matches", () => {
      const balances = new Balances([b1, b2])
      const result = balances.find({ address: "nonexistent" })
      expect(result.count).toBe(0)
    })

    it("finds by array of queries (OR logic)", () => {
      const balances = new Balances([b1, b2, b3])
      const result = balances.find([{ address: "0x01" }, { tokenId: "token-b" }])
      // 0x01::token-a (matches first), 0x02::token-b (matches second), 0x01::token-b (matches both)
      expect(result.count).toBe(3)
    })
  })

  describe("add()", () => {
    it("adds a single Balance", () => {
      const balances = new Balances([makeBalance("0x01", "token-a")])
      const result = balances.add(makeBalance("0x02", "token-b"))
      expect(result.count).toBe(2)
    })

    it("adds Balances collection", () => {
      const a = new Balances([makeBalance("0x01", "token-a")])
      const b = new Balances([makeBalance("0x02", "token-b"), makeBalance("0x03", "token-c")])
      const result = a.add(b)
      expect(result.count).toBe(3)
    })

    it("deduplicates by id (added takes priority)", () => {
      const original = new Balances([
        new Balance(makeBalanceJson({ address: "0x01", tokenId: "token-a", value: "100" })),
      ])
      const added = new Balance(
        makeBalanceJson({ address: "0x01", tokenId: "token-a", value: "999" })
      )
      const result = original.add(added)

      expect(result.count).toBe(1)
      expect(result.get("0x01::token-a")!.toJSON().value).toBe("999")
    })
  })

  describe("remove()", () => {
    it("removes by single id", () => {
      const balances = new Balances([
        makeBalance("0x01", "token-a"),
        makeBalance("0x02", "token-b"),
      ])
      const result = balances.remove("0x01::token-a")
      expect(result.count).toBe(1)
      expect(result.get("0x01::token-a")).toBeNull()
    })

    it("removes by id array", () => {
      const balances = new Balances([
        makeBalance("0x01", "token-a"),
        makeBalance("0x02", "token-b"),
        makeBalance("0x03", "token-c"),
      ])
      const result = balances.remove(["0x01::token-a", "0x03::token-c"])
      expect(result.count).toBe(1)
      expect(result.get("0x02::token-b")).toBeTruthy()
    })

    it("handles non-existent id gracefully", () => {
      const balances = new Balances([makeBalance("0x01", "token-a")])
      const result = balances.remove("nonexistent")
      expect(result.count).toBe(1)
    })
  })

  describe("each", () => {
    it("returns array of all balances", () => {
      const balances = new Balances([
        makeBalance("0x01", "token-a"),
        makeBalance("0x02", "token-b"),
      ])
      expect(balances.each).toHaveLength(2)
      expect(Array.isArray(balances.each)).toBe(true)
    })

    it("returns stable cached reference on same instance", () => {
      const balances = new Balances([makeBalance("0x01", "token-a")])
      const ref1 = balances.each
      const ref2 = balances.each
      expect(ref1).toBe(ref2)
    })

    it("returns different reference on different instance", () => {
      const b = makeBalance("0x01", "token-a")
      const b1 = new Balances([b])
      const b2 = new Balances([b])
      expect(b1.each).not.toBe(b2.each)
    })
  })

  describe("count", () => {
    it("returns correct count", () => {
      const balances = new Balances([
        makeBalance("0x01", "token-a"),
        makeBalance("0x02", "token-b"),
      ])
      expect(balances.count).toBe(2)
    })

    it("returns 0 for empty collection", () => {
      expect(new Balances([]).count).toBe(0)
    })
  })

  describe("iterator", () => {
    it("supports for...of", () => {
      const b1 = makeBalance("0x01", "token-a")
      const b2 = makeBalance("0x02", "token-b")
      const balances = new Balances([b1, b2])
      const collected: Balance[] = []
      for (const b of balances) collected.push(b)
      expect(collected).toHaveLength(2)
    })

    it("supports spread", () => {
      const balances = new Balances([
        makeBalance("0x01", "token-a"),
        makeBalance("0x02", "token-b"),
      ])
      expect([...balances]).toHaveLength(2)
    })
  })

  describe("filterMirrorTokens()", () => {
    it("returns all when no mirror tokens", () => {
      const balances = new Balances([
        makeBalance("0x01", "token-a"),
        makeBalance("0x02", "token-b"),
      ])
      const filtered = balances.filterMirrorTokens()
      expect(filtered.count).toBe(2)
    })

    it("filters out balances whose token.mirrorOf points to a tokenId in the collection", () => {
      const hydrate: HydrateDb = {
        tokens: {
          "token-a": {
            id: "token-a",
            type: "substrate-native",
            symbol: "A",
            decimals: 10,
            networkId: "net",
          },
          "token-b": {
            id: "token-b",
            type: "substrate-native",
            symbol: "B",
            decimals: 10,
            networkId: "net",
            mirrorOf: "token-a",
          },
          "token-c": {
            id: "token-c",
            type: "substrate-native",
            symbol: "C",
            decimals: 10,
            networkId: "net",
          },
        } as unknown as HydrateDb["tokens"],
      }
      const balances = new Balances(
        [
          makeBalance("0x01", "token-a"),
          makeBalance("0x01", "token-b"),
          makeBalance("0x01", "token-c"),
        ],
        hydrate
      )
      const filtered = balances.filterMirrorTokens()
      // token-b mirrors token-a which exists → filtered out
      expect(filtered.count).toBe(2)
      expect(filtered.get("0x01::token-a")).toBeTruthy()
      expect(filtered.get("0x01::token-b")).toBeNull()
      expect(filtered.get("0x01::token-c")).toBeTruthy()
    })

    it("keeps balances whose mirrorOf target is NOT in the collection", () => {
      const hydrate: HydrateDb = {
        tokens: {
          "token-a": {
            id: "token-a",
            type: "substrate-native",
            symbol: "A",
            decimals: 10,
            networkId: "net",
          },
          "token-b": {
            id: "token-b",
            type: "substrate-native",
            symbol: "B",
            decimals: 10,
            networkId: "net",
            mirrorOf: "token-missing",
          },
        } as unknown as HydrateDb["tokens"],
      }
      const balances = new Balances(
        [makeBalance("0x01", "token-a"), makeBalance("0x01", "token-b")],
        hydrate
      )
      const filtered = balances.filterMirrorTokens()
      // token-b mirrors "token-missing" which is NOT in collection → kept
      expect(filtered.count).toBe(2)
    })

    it("returns cached reference on repeated calls", () => {
      const balances = new Balances([makeBalance("0x01", "token-a")])
      const ref1 = balances.filterMirrorTokens()
      const ref2 = balances.filterMirrorTokens()
      expect(ref1).toBe(ref2)
    })
  })

  describe("sum", () => {
    it("returns a SumBalancesFormatter", () => {
      const balances = new Balances([makeBalance("0x01", "token-a")])
      expect(balances.sum).toBeTruthy()
      expect(typeof balances.sum.fiat).toBe("function")
    })

    it("returns cached reference on repeated calls", () => {
      const balances = new Balances([makeBalance("0x01", "token-a")])
      const ref1 = balances.sum
      const ref2 = balances.sum
      expect(ref1).toBe(ref2)
    })
  })

  describe("toJSON()", () => {
    it("returns BalanceJsonList", () => {
      const json = makeBalanceJson({ address: "0x01", tokenId: "token-a", value: "12345" })
      const balances = new Balances([json])
      const result = balances.toJSON()

      expect(typeof result).toBe("object")
      expect(result["0x01::token-a"]).toBeTruthy()
      expect(result["0x01::token-a"].value).toBe("12345")
    })

    it("round-trips stably: construct → toJSON → construct → toJSON", () => {
      const jsons = [
        makeBalanceJson({ address: "0x01", tokenId: "token-a", value: "100" }),
        makeBalanceJson({ address: "0x02", tokenId: "token-b", value: "200" }),
      ]
      const first = new Balances(jsons)
      const json1 = first.toJSON()
      const second = new Balances(json1)
      const json2 = second.toJSON()

      expect(json2).toEqual(json1)
    })
  })

  describe("immutability", () => {
    it("add() does not mutate original", () => {
      const original = new Balances([makeBalance("0x01", "token-a")])
      original.add(makeBalance("0x02", "token-b"))
      expect(original.count).toBe(1)
    })

    it("remove() does not mutate original", () => {
      const original = new Balances([
        makeBalance("0x01", "token-a"),
        makeBalance("0x02", "token-b"),
      ])
      original.remove("0x01::token-a")
      expect(original.count).toBe(2)
    })
  })

  describe("hydrate()", () => {
    it("calls hydrate on all balances", () => {
      const balances = new Balances([
        makeBalance("0x01", "token-a"),
        makeBalance("0x02", "token-b"),
      ])
      const db: HydrateDb = { tokens: {} }
      // Should not throw
      balances.hydrate(db)
    })

    it("invalidates caches after hydrate", () => {
      const balances = new Balances([makeBalance("0x01", "token-a")])

      // Prime caches
      const eachRef = balances.each
      const filterRef = balances.filterMirrorTokens()
      const sumRef = balances.sum

      // Hydrate should invalidate
      balances.hydrate({})

      // After hydrate, each should return a new reference (cache was cleared)
      expect(balances.each).not.toBe(eachRef)
      expect(balances.filterMirrorTokens()).not.toBe(filterRef)
      expect(balances.sum).not.toBe(sumRef)
    })
  })

  describe("sorted (deprecated)", () => {
    it("returns same as each", () => {
      const balances = new Balances([makeBalance("0x01", "token-a")])
      expect(balances.sorted).toEqual(balances.each)
    })
  })
})
