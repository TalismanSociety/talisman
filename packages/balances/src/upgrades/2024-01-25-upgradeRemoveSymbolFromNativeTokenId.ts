import { Transaction } from "dexie"

import log from "../log"
import { Balance, BalanceJson } from "../types"

// for DB version 3, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = async (tx: Transaction) => {
  const balancesTable = tx.table<BalanceJson & { id: string }, string>("balances")

  try {
    await balancesTable.toCollection().modify((balance) => {
      if (balance?.tokenId?.includes?.("-substrate-native-")) {
        balance.tokenId = balance.tokenId.replace(/-substrate-native-.+$/, "-substrate-native")
        balance.id = new Balance(balance).id
      }

      if (balance?.tokenId?.includes?.("-evm-native-")) {
        balance.tokenId = balance.tokenId.replace(/-evm-native-.+$/, "-evm-native")
        balance.id = new Balance(balance).id
      }
    })
  } catch (err) {
    // error most likely due to duplicate ids => clear the db
    log.error("Failed to upgrade balances native token ids", { err })
    await balancesTable.clear()
  }
}
