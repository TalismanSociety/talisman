import { log } from "extension-shared"
import pako from "pako"

import { db } from "./db"

export type DbBlobId =
  | "nfts"
  | "balances"
  | "chaindata"
  | "tokenRates"
  | "defi-positions"
  | "dynamic-tokens"
  | "bittensor-validators"

export type DbBlobItem = { id: DbBlobId; data: Uint8Array }

export const getBlobStore = <Data = unknown>(id: DbBlobId) => ({
  set: (data: Data) => db.blobs.put({ id, data: pako.deflate(JSON.stringify(data)) }),
  get: async () => {
    try {
      const blob = await db.blobs.get(id)
      if (!blob?.data) return null

      return JSON.parse(pako.inflate(blob.data, { to: "string" })) as Data
    } catch (err) {
      log.error("Error parsing blob data", { id, err })
      return null
    }
  },
})
