import { Transaction as DbTransaction } from "dexie"

import { LegacyWalletTransaction } from "../../domains/transactions"

// For DB version 8, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = async (tx: DbTransaction) => {
  await tx
    .table<LegacyWalletTransaction, string>("transactions")
    .toCollection()
    .modify((wtx) => {
      if (wtx?.tokenId?.includes?.("-substrate-native-"))
        wtx.tokenId = wtx.tokenId.replace(/-substrate-native-.+$/, "-substrate-native")

      if (wtx?.tokenId?.includes?.("-evm-native-"))
        wtx.tokenId = wtx.tokenId.replace(/-evm-native-.+$/, "-evm-native")
    })
}
