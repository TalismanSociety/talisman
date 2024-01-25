import { WalletTransaction } from "@core/domains/transactions"
import { Transaction as DbTransaction } from "dexie"

// For db version 8, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = (tx: DbTransaction) => {
  return tx
    .table<WalletTransaction, string>("transactions")
    .toCollection()
    .modify((wtx) => {
      if (wtx?.tokenId?.includes?.("-substrate-native-"))
        wtx.tokenId.replace(/-substrate-native-.+$/, "-substrate-native")

      if (wtx?.tokenId?.includes?.("-evm-native-"))
        wtx.tokenId.replace(/-evm-native-.+$/, "-evm-native")
    })
}
