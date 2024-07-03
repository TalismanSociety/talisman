import { Table } from "dexie"
import pako from "pako"

import { db } from "../../TalismanBalancesDatabase"
import { BalanceJson } from "../../types"

export type StoredBalanceJson = Omit<BalanceJson, "status">

export const configureStore = (dbTable: Table = db.balancesBlob) => ({
  persistData: async (balances: StoredBalanceJson[]) => {
    const output = compress(balances)
    await dbTable.clear()
    await dbTable.put({ data: output, id: Date.now().toString() })
  },
  retrieveData: async (): Promise<StoredBalanceJson[]> => {
    const compressedData = await dbTable.toCollection().first()
    if (!compressedData) return []
    return decompress(compressedData.data)
  },
})

export const compress = (balances: StoredBalanceJson[]) => pako.deflate(JSON.stringify(balances))
export const decompress = (data: Uint8Array | ArrayBuffer): StoredBalanceJson[] => {
  const decompressed = pako.inflate(data, { to: "string" })
  return JSON.parse(decompressed)
}
