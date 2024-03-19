import pako from "pako"

import { db } from "../../TalismanBalancesDatabase"
import { BalanceJson } from "../../types"

type StoredBalanceJson = Omit<BalanceJson, "status">

export const persistData = async (balances: StoredBalanceJson[]) => {
  const output = pako.deflate(JSON.stringify(balances))
  await db.balancesBlob.put(output, "data")
}

export const retrieveData = async (): Promise<StoredBalanceJson[]> => {
  const compressedData = await db.balancesBlob.toCollection().first()
  if (!compressedData) return []
  const data = pako.inflate(compressedData, { to: "string" })
  return JSON.parse(data)
}
