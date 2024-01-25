import { Transaction } from "dexie"

import { Balance, BalanceJson } from "../types"

// for DB version 3, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = async (tx: Transaction) => {
  const balancesTable = tx.table<BalanceJson, string>("balances")

  await balancesTable.toCollection().modify((balance) => {
    if (balance?.tokenId?.includes?.("-substrate-native-")) {
      balance.tokenId.replace(/-substrate-native-.+$/, "-substrate-native")
      balance = new Balance(balance).toJSON() // update the balance id
    }

    if (balance?.tokenId?.includes?.("-evm-native-")) {
      balance.tokenId.replace(/-evm-native-.+$/, "-evm-native")
      balance = new Balance(balance).toJSON() // update the balance id
    }
  })
}
