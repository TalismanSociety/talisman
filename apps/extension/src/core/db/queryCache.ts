import { log } from "@common/log"
import pako from "pako"

import { db } from "./db"

export type QueryCacheItem = {
  key: string
  data: Uint8Array
  purgeAt: number
  updatedAt: number
  dataUpdatedAt: number
}

export const queryCacheStore = {
  async get(key: string): Promise<{ data: unknown; dataUpdatedAt: number } | null> {
    try {
      const row = await db.queryCache.get(key)
      if (!row?.data) return null

      if (row.purgeAt <= Date.now()) {
        await db.queryCache.delete(key).catch(() => {})
        return null
      }

      return {
        data: JSON.parse(pako.inflate(row.data, { to: "string" })),
        dataUpdatedAt: row.dataUpdatedAt,
      }
    } catch (err) {
      log.error("Error reading query cache", { key, err })
      return null
    }
  },

  async set(key: string, data: unknown, purgeAt: number, dataUpdatedAt: number): Promise<boolean> {
    try {
      const now = Date.now()
      await db.queryCache.put({
        key,
        data: pako.deflate(JSON.stringify(data)),
        purgeAt,
        updatedAt: now,
        dataUpdatedAt,
      })
      return true
    } catch (err) {
      log.error("Error writing query cache", { key, err })
      return false
    }
  },

  async remove(key: string): Promise<boolean> {
    try {
      await db.queryCache.delete(key)
      return true
    } catch (err) {
      log.error("Error removing query cache entry", { key, err })
      return false
    }
  },

  async purgeExpired(): Promise<number> {
    try {
      return await db.queryCache.where("purgeAt").belowOrEqual(Date.now()).delete()
    } catch (err) {
      log.error("Error purging expired query cache entries", err)
      return 0
    }
  },
}
