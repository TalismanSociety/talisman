import pako from "pako"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { db } from "../db"
import { queryCacheStore } from "../queryCache"

describe("queryCacheStore", () => {
  beforeEach(async () => {
    await db.queryCache.clear()
  })

  afterEach(async () => {
    await db.queryCache.clear()
  })

  describe("set and get", () => {
    it("should round-trip JSON-serializable data through compression", async () => {
      const data = { prices: [1.23, 4.56], tokens: ["DOT", "KSM"] }
      const purgeAt = Date.now() + 60_000
      const dataUpdatedAt = Date.now()

      await queryCacheStore.set("test-key", data, purgeAt, dataUpdatedAt)
      const result = await queryCacheStore.get("test-key")

      expect(result).not.toBeNull()
      expect(result?.data).toEqual(data)
      expect(result?.dataUpdatedAt).toBe(dataUpdatedAt)
    })

    it("should store data as compressed Uint8Array in the database", async () => {
      const data = { hello: "world" }
      await queryCacheStore.set("compressed-key", data, Date.now() + 60_000, Date.now())

      const row = await db.queryCache.get("compressed-key")
      expect(row).toBeDefined()
      expect(row!.data).toBeInstanceOf(Uint8Array)

      const decompressed = JSON.parse(pako.inflate(row!.data, { to: "string" }))
      expect(decompressed).toEqual(data)
    })

    it("should return null for non-existent keys", async () => {
      const result = await queryCacheStore.get("does-not-exist")
      expect(result).toBeNull()
    })

    it("should overwrite existing entries with same key", async () => {
      await queryCacheStore.set("overwrite-key", { v: 1 }, Date.now() + 60_000, Date.now())
      await queryCacheStore.set("overwrite-key", { v: 2 }, Date.now() + 60_000, Date.now())

      const result = await queryCacheStore.get("overwrite-key")
      expect(result?.data).toEqual({ v: 2 })
    })
  })

  describe("expiry on read", () => {
    it("should return null and delete row when entry is expired", async () => {
      const pastPurgeAt = Date.now() - 1000
      await queryCacheStore.set("expired-key", { old: true }, pastPurgeAt, Date.now() - 2000)

      const result = await queryCacheStore.get("expired-key")
      expect(result).toBeNull()

      const row = await db.queryCache.get("expired-key")
      expect(row).toBeUndefined()
    })

    it("should return data when entry is not yet expired", async () => {
      const futurePurgeAt = Date.now() + 60_000
      await queryCacheStore.set("fresh-key", { fresh: true }, futurePurgeAt, Date.now())

      const result = await queryCacheStore.get("fresh-key")
      expect(result).not.toBeNull()
      expect(result?.data).toEqual({ fresh: true })
    })
  })

  describe("remove", () => {
    it("should remove an existing entry", async () => {
      await queryCacheStore.set("remove-key", { remove: true }, Date.now() + 60_000, Date.now())

      const removed = await queryCacheStore.remove("remove-key")
      expect(removed).toBe(true)

      const result = await queryCacheStore.get("remove-key")
      expect(result).toBeNull()
    })

    it("should return true even when key does not exist", async () => {
      const removed = await queryCacheStore.remove("nonexistent")
      expect(removed).toBe(true)
    })
  })

  describe("purgeExpired", () => {
    it("should delete all expired entries and keep non-expired ones", async () => {
      const now = Date.now()
      await queryCacheStore.set("expired-1", { a: 1 }, now - 2000, now - 3000)
      await queryCacheStore.set("expired-2", { b: 2 }, now - 1000, now - 2000)
      await queryCacheStore.set("valid-1", { c: 3 }, now + 60_000, now)
      await queryCacheStore.set("valid-2", { d: 4 }, now + 120_000, now)

      const purged = await queryCacheStore.purgeExpired()
      expect(purged).toBe(2)

      expect(await queryCacheStore.get("valid-1")).not.toBeNull()
      expect(await queryCacheStore.get("valid-2")).not.toBeNull()

      const row1 = await db.queryCache.get("expired-1")
      const row2 = await db.queryCache.get("expired-2")
      expect(row1).toBeUndefined()
      expect(row2).toBeUndefined()
    })

    it("should return 0 when no entries are expired", async () => {
      await queryCacheStore.set("still-valid", { ok: true }, Date.now() + 60_000, Date.now())
      const purged = await queryCacheStore.purgeExpired()
      expect(purged).toBe(0)
    })
  })

  describe("edge cases", () => {
    it("should handle null and undefined values", async () => {
      await queryCacheStore.set("null-val", null, Date.now() + 60_000, Date.now())
      const result = await queryCacheStore.get("null-val")
      expect(result?.data).toBeNull()
    })

    it("should handle arrays", async () => {
      const data = [1, "two", { three: 3 }]
      await queryCacheStore.set("array-val", data, Date.now() + 60_000, Date.now())
      const result = await queryCacheStore.get("array-val")
      expect(result?.data).toEqual(data)
    })

    it("should handle large payloads", async () => {
      const largeData = Array.from({ length: 10_000 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        value: Math.random(),
      }))
      await queryCacheStore.set("large-key", largeData, Date.now() + 60_000, Date.now())
      const result = await queryCacheStore.get("large-key")
      expect(result?.data).toEqual(largeData)
    })
  })
})
