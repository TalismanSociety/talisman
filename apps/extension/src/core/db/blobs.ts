import { log } from "@common/log"
import { deflateJson, inflateJson } from "./compression"
import { db } from "./db"

export type DbBlobId =
  | "nfts"
  | "balances"
  | "chaindata"
  | "tokenRates"
  | "defi-positions"
  | "yieldxyz-positions"
  | "yieldxyz-products"
  | "yieldxyz-providers"
  | "dynamic-tokens"
  | "bittensor-validators:v2"
  | "phishing-metamask"
  | "phishing-polkadot"
  | "account-proxies"
  | "proxy-pallet-cache"

export type DbBlobItem = { id: DbBlobId; data: Uint8Array<ArrayBuffer> }

export const getBlobStore = <Data = unknown>(id: DbBlobId) => ({
  set: async (data: Data) => db.blobs.put({ id, data: await deflateJson(data) }),
  get: async () => {
    try {
      const blob = await db.blobs.get(id)
      if (!blob?.data) return null

      return (await inflateJson(blob.data)) as Data
    } catch (err) {
      log.error("Error parsing blob data", { id, err })
      return null
    }
  },
})
