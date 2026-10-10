import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

export const PAH_HOLDER = "15GHgiQc55ugweKbvZ6UYaDEFoQ3CJVy3NuaiJdB4eYUEzd8"

export const PAH_METADATA_RPC: `0x${string}` = `0x${gunzipSync(
  readFileSync(
    path.resolve(
      import.meta.dirname,
      "../../../../../tests/fixtures/assethub-metadata-v15.scale.gz"
    )
  )
).toString("hex")}`

type StorageChange = [key: `0x${string}`, value: `0x${string}` | null]

type RecordedRpc = {
  nftsOwnedKeys: { prefix: string; keys: `0x${string}`[] }
  uniquesOwnedKeys: { prefix: string; keys: `0x${string}`[] }
  storageAt: { block: `0x${string}`; changes: StorageChange[] }
}

const loadRecordedRpc = (): RecordedRpc => {
  const [nfts, storage, uniques] = JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, "pah-holder-rpc.json"), "utf8")
  )
  return {
    nftsOwnedKeys: { prefix: nfts.params[0], keys: nfts.result },
    uniquesOwnedKeys: { prefix: uniques.params[0], keys: uniques.result },
    storageAt: storage.result[0],
  }
}

export const PAH_HOLDER_RPC = loadRecordedRpc()
