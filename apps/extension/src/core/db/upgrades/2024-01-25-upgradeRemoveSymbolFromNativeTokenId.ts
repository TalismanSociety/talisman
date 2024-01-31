import { WalletTransaction } from "@core/domains/transactions"
import { DbTokenRates } from "@talismn/token-rates"
import { Transaction as DbTransaction } from "dexie"

// For db version 8, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = async (tx: DbTransaction) => {
  await tx
    .table<WalletTransaction, string>("transactions")
    .toCollection()
    .modify((wtx) => {
      if (wtx?.tokenId?.includes?.("-substrate-native-"))
        wtx.tokenId = wtx.tokenId.replace(/-substrate-native-.+$/, "-substrate-native")

      if (wtx?.tokenId?.includes?.("-evm-native-"))
        wtx.tokenId = wtx.tokenId.replace(/-evm-native-.+$/, "-evm-native")
    })

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