import { Transaction } from "dexie"

import { DbTokenRates } from "../types"

// for DB version 3, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = async (tx: Transaction) => {
  await tx
    .table<DbTokenRates, string>("tokenRates")
    .toCollection()
    .modify((tokenRate) => {
      if (tokenRate?.tokenId?.includes?.("-substrate-native-")) {
        tokenRate.tokenId = tokenRate.tokenId.replace(/-substrate-native-.+$/, "-substrate-native")
      }

      if (tokenRate?.tokenId?.includes?.("-evm-native-")) {
        tokenRate.tokenId = tokenRate.tokenId.replace(/-evm-native-.+$/, "-evm-native")
      }
    })
}
