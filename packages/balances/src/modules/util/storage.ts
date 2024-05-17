import { Table } from "dexie"
import pako from "pako"

import { db } from "../../TalismanBalancesDatabase"
import { BalanceJson } from "../../types"

export type StoredBalanceJson = Omit<BalanceJson, "status">

export const configureStore = (dbTable: Table = db.balancesBlob) => ({
  persistData: async (balances: StoredBalanceJson[]) => {
    const output = pako.deflate(JSON.stringify(balances))
    await dbTable.clear()
    await dbTable.put({ data: output, id: Date.now().toString() })
  },
  retrieveData: async (): Promise<StoredBalanceJson[]> => {
    const compressedData = await dbTable.toCollection().first()
    if (!compressedData) return []
    const data = pako.inflate(compressedData.data, { to: "string" })
    return JSON.parse(data)
  },
})
