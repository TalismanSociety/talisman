import "fake-indexeddb/auto"
import { Dexie } from "dexie"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { connectionMetaDb, TalismanConnectionMetaDatabase } from "./index"

describe("TalismanConnectionMetaDatabase", () => {
  let db: TalismanConnectionMetaDatabase

  beforeEach(() => {
    db = new TalismanConnectionMetaDatabase()
  })

  afterEach(async () => {
    await db.delete()
  })

  describe("construction", () => {
    it("creates without error", () => {
      expect(db).toBeDefined()
    })

    it("is an instance of Dexie", () => {
      expect(db).toBeInstanceOf(Dexie)
    })

    it("has chainPriorityRpcs table", () => {
      expect(db.chainPriorityRpcs).toBeDefined()
      expect(db.table("chainPriorityRpcs")).toBeDefined()
    })

    it("has chainBackoffInterval table", () => {
      expect(db.chainBackoffInterval).toBeDefined()
      expect(db.table("chainBackoffInterval")).toBeDefined()
    })
  })

  describe("schema version", () => {
    it("has version 2", () => {
      expect(db.verno).toBe(2)
    })
  })

  describe("chainPriorityRpcs CRUD", () => {
    it("puts and gets an entry by id", async () => {
      await db.chainPriorityRpcs.put({
        id: "polkadot",
        urls: ["wss://rpc.polkadot.io", "wss://polkadot.api.onfinality.io"],
      })

      const result = await db.chainPriorityRpcs.get("polkadot")
      expect(result).toEqual({
        id: "polkadot",
        urls: ["wss://rpc.polkadot.io", "wss://polkadot.api.onfinality.io"],
      })
    })

    it("stores id and urls fields", async () => {
      const entry = { id: "kusama" as const, urls: ["wss://kusama-rpc.polkadot.io"] }
      await db.chainPriorityRpcs.put(entry)

      const result = await db.chainPriorityRpcs.get("kusama")
      expect(result?.id).toBe("kusama")
      expect(result?.urls).toEqual(["wss://kusama-rpc.polkadot.io"])
    })

    it("updates an existing entry", async () => {
      await db.chainPriorityRpcs.put({ id: "polkadot", urls: ["wss://old-rpc.io"] })
      await db.chainPriorityRpcs.put({
        id: "polkadot",
        urls: ["wss://new-rpc.io", "wss://backup-rpc.io"],
      })

      const result = await db.chainPriorityRpcs.get("polkadot")
      expect(result?.urls).toEqual(["wss://new-rpc.io", "wss://backup-rpc.io"])
    })

    it("deletes an entry", async () => {
      await db.chainPriorityRpcs.put({ id: "westend", urls: ["wss://westend-rpc.io"] })
      await db.chainPriorityRpcs.delete("westend")

      const result = await db.chainPriorityRpcs.get("westend")
      expect(result).toBeUndefined()
    })

    it("queries all entries with toArray", async () => {
      await db.chainPriorityRpcs.bulkPut([
        { id: "polkadot", urls: ["wss://rpc1.io"] },
        { id: "kusama", urls: ["wss://rpc2.io"] },
        { id: "westend", urls: ["wss://rpc3.io"] },
      ])

      const all = await db.chainPriorityRpcs.toArray()
      expect(all).toHaveLength(3)
      expect(all.map((e) => e.id).sort()).toEqual(["kusama", "polkadot", "westend"])
    })

    it("returns undefined for non-existent entry", async () => {
      const result = await db.chainPriorityRpcs.get("nonexistent")
      expect(result).toBeUndefined()
    })
  })

  describe("chainBackoffInterval CRUD", () => {
    it("puts and gets an entry by id", async () => {
      await db.chainBackoffInterval.put({ id: "polkadot", interval: 5000 })

      const result = await db.chainBackoffInterval.get("polkadot")
      expect(result).toEqual({ id: "polkadot", interval: 5000 })
    })

    it("stores id and interval fields", async () => {
      await db.chainBackoffInterval.put({ id: "kusama", interval: 3000 })

      const result = await db.chainBackoffInterval.get("kusama")
      expect(result?.id).toBe("kusama")
      expect(result?.interval).toBe(3000)
    })

    it("updates an existing entry", async () => {
      await db.chainBackoffInterval.put({ id: "polkadot", interval: 1000 })
      await db.chainBackoffInterval.put({ id: "polkadot", interval: 10000 })

      const result = await db.chainBackoffInterval.get("polkadot")
      expect(result?.interval).toBe(10000)
    })

    it("deletes an entry", async () => {
      await db.chainBackoffInterval.put({ id: "westend", interval: 2000 })
      await db.chainBackoffInterval.delete("westend")

      const result = await db.chainBackoffInterval.get("westend")
      expect(result).toBeUndefined()
    })

    it("returns undefined for non-existent entry", async () => {
      const result = await db.chainBackoffInterval.get("nonexistent")
      expect(result).toBeUndefined()
    })
  })

  describe("module exports", () => {
    it("exports connectionMetaDb as an instance of TalismanConnectionMetaDatabase", () => {
      expect(connectionMetaDb).toBeInstanceOf(TalismanConnectionMetaDatabase)
    })

    it("exports TalismanConnectionMetaDatabase class", () => {
      expect(TalismanConnectionMetaDatabase).toBeDefined()
      expect(typeof TalismanConnectionMetaDatabase).toBe("function")
    })
  })
})
