import { Transaction } from "dexie"
import pako from "pako"

import { BalanceJson } from "../types"

// for DB version 4, Wallet version 1.26.0
// converts the structured balances data to a single compressed string
export const upgradeBalancesDataBlob = async (tx: Transaction) => {
  const balancesTable = tx.table<BalanceJson & { id: string }, string>("balances")
  const balancesData = await balancesTable.toCollection().toArray()
  // migrate to new format
  const complexBalanceTypes = ["substrate-native", "substrate-tokens", "substrate-assets"]
  balancesData.forEach((balance) => {
    if (complexBalanceTypes.includes(balance.source)) {
      balance.values = []
    }
  })
  const output = pako.deflate(JSON.stringify(balancesData))
  // now write the compressed data back to the db and clear the old one
  await tx.table("balancesBlob").put({ data: output, id: Date.now().toString() })
  await tx.table("balances").clear()
}
