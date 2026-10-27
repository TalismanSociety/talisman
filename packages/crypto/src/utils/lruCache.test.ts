import { describe, expect, it } from "vitest"

import { LruCache } from "./lruCache"

describe("LruCache", () => {
  it("evicts the least recently used entry past its size", () => {
    const cache = new LruCache<number>(2, 10)
    cache.set("a", 1)
    cache.set("b", 2)
    expect(cache.get("a")).toBe(1) // "b" is now the least recently used
    cache.set("c", 3)
    expect(cache.size).toBe(2)
    expect(cache.has("b")).toBe(false)
    expect(cache.get("a")).toBe(1)
    expect(cache.get("c")).toBe(3)
  })

  it("keeps falsy values", () => {
    const cache = new LruCache<number | null>(2, 10)
    cache.set("zero", 0)
    cache.set("null", null)
    expect(cache.get("zero")).toBe(0)
    expect(cache.get("null")).toBeNull()
    expect(cache.get("missing")).toBeUndefined()
  })

  it("updates an existing key without growing", () => {
    const cache = new LruCache<number>(2, 10)
    cache.set("a", 1)
    cache.set("a", 2)
    expect(cache.size).toBe(1)
    expect(cache.get("a")).toBe(2)
  })

  it("doesn't store keys over the length limit", () => {
    const cache = new LruCache<number>(2, 3)
    cache.set("abcd", 1)
    expect(cache.has("abcd")).toBe(false)
  })
})
