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
    it("should return a null entry rather than a miss when the stored value is null", async () => {
      const dataUpdatedAt = Date.now()
      await queryCacheStore.set("null-val", null, Date.now() + 60_000, dataUpdatedAt)
      const result = await queryCacheStore.get("null-val")
      expect(result).toEqual({ data: null, dataUpdatedAt })
    })
  })
})
