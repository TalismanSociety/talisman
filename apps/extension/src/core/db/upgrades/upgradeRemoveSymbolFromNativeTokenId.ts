import { WalletTransaction } from "@core/domains/transactions"
import { Transaction as DbTransaction } from "dexie"

// for DB version 2, Wallet version 1.21.0
export const upgradeRemoveSymbolFromNativeTokenId = async (tx: DbTransaction) => {
  return tx
    .table<WalletTransaction, string>("transactions")
    .toCollection()
    .modify((wtx) => {
      if (wtx.tokenId) wtx.tokenId = wtx.tokenId.replace(/-native(-[a-zA-Z0-9]+)$/, "-native")
    })
}
