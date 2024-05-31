import { Transaction } from "dexie"
import pako from "pako"

import { BalanceJson } from "../types"

// "locks": [{"label":"fees","amount":"0","includeInTransferable":true,"excludeFromFeePayable":true},{"label":"misc","amount":"0"}]
// "reserves":[{"label":"reserved","amount":"0"}]
type LegacyBalanceJson = BalanceJson & {
  id: string
  free: string
  reserves: Array<{ amount: string; type: string }>
  locks: Array<{ amount: string; type: string }>
  extra: Array<{ amount: string; type: string }>
}

// for DB version 4, Wallet version 1.26.0
// converts the structured balances data to a single compressed string
export const upgradeBalancesDataBlob = async (tx: Transaction) => {
  const balancesTable = tx.table<BalanceJson & { id: string }, string>("balances")
  const balancesData = (await balancesTable.toCollection().toArray()) as LegacyBalanceJson[]
  // migrate to new format
  const complexBalanceTypes = ["substrate-native", "substrate-tokens", "substrate-assets"]
  const migratedData = balancesData
    .map((balance) => {
      if (complexBalanceTypes.includes(balance.source)) {
        // too complicated to migrate subsource balances, so just clear them
        if ("subSource" in balance) return false

        if (balance.free && balance.free !== "0")
          balance.values = [{ amount: balance.free, type: "free", label: "free" }]
        else return false
      } else {
        if (balance.free && balance.free !== "0") balance.value = balance.free
        else return false
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { locks, reserves, extra, ...stuffToKeep } = balance

      return stuffToKeep
    })
    .filter(Boolean)

  const output = pako.deflate(JSON.stringify(migratedData))
  // now write the compressed data back to the db and clear the old one
  await tx.table("balancesBlob").put({ data: output, id: Date.now().toString() })
  await tx.table("balances").clear()
}
