import { describe, expect, it } from "vitest"

import { LruMap } from "./lruMap"

describe("LruMap", () => {
  it("stores and retrieves values", () => {
    const map = new LruMap<string, number>(3)
    map.set("a", 1)
    expect(map.get("a")).toBe(1)
    expect(map.has("a")).toBe(true)
    expect(map.size).toBe(1)
  })

  it("evicts the least-recently-used entry when full", () => {
    const map = new LruMap<string, number>(3)
    map.set("a", 1)
    map.set("b", 2)
    map.set("c", 3)
    map.set("d", 4) // evicts "a"

    expect(map.has("a")).toBe(false)
    expect(map.has("b")).toBe(true)
    expect(map.size).toBe(3)
  })

  it("get refreshes recency", () => {
    const map = new LruMap<string, number>(3)
    map.set("a", 1)
    map.set("b", 2)
    map.set("c", 3)
    map.get("a") // "b" is now the oldest
    map.set("d", 4) // evicts "b"

    expect(map.has("a")).toBe(true)
    expect(map.has("b")).toBe(false)
  })

  it("set on an existing key refreshes recency without eviction", () => {
    const map = new LruMap<string, number>(2)
    map.set("a", 1)
    map.set("b", 2)
    map.set("a", 10) // refresh, no eviction
    expect(map.size).toBe(2)
    expect(map.get("a")).toBe(10)

    map.set("c", 3) // evicts "b" (oldest)
    expect(map.has("b")).toBe(false)
    expect(map.has("a")).toBe(true)
  })

  it("supports delete and clear", () => {
    const map = new LruMap<string, number>(2)
    map.set("a", 1)
    expect(map.delete("a")).toBe(true)
    expect(map.delete("a")).toBe(false)
    map.set("b", 2)
    map.clear()
    expect(map.size).toBe(0)
  })

  it("rejects invalid maxSize", () => {
    expect(() => new LruMap(0)).toThrow()
  })
})
