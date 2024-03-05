import { DbTokenRates } from "@talismn/token-rates"
import { Transaction as DbTransaction } from "dexie"

import { WalletTransaction } from "../../domains/transactions"

// For DB version 8, Wallet version 1.21.0
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

  const uniqueTokenRates = new Map(
    (await tx.table<DbTokenRates, string>("tokenRates").toArray()).map((tokenRate) => {
      if (tokenRate?.tokenId?.includes?.("-substrate-native-"))
        tokenRate.tokenId = tokenRate.tokenId.replace(/-substrate-native-.+$/, "-substrate-native")

      if (tokenRate?.tokenId?.includes?.("-evm-native-"))
        tokenRate.tokenId = tokenRate.tokenId.replace(/-evm-native-.+$/, "-evm-native")

      return [tokenRate.tokenId, tokenRate]
    })
  )

  await tx.table<DbTokenRates, string>("tokenRates").clear()
  await tx.table<DbTokenRates, string>("tokenRates").bulkPut([...uniqueTokenRates.values()])
}
