import { ProtectorSources, ProtectorStorage } from "@core/domains/app/protector/ParaverseProtector"
import { WalletTransaction } from "@core/domains/transactions/types"
import { MetadataDef } from "@core/inject/types"
import { DbTokenRates } from "@talismn/token-rates"
import { Dexie, Transaction, Version } from "dexie"
import Browser from "webextension-polyfill"

import { migrateExtensionDbV5ToV6 } from "./migrations/5to6"

export const MIGRATION_ERROR_MSG = "Talisman Dexie Migration Error"

const inBackgroundScript = (cb: Parameters<Version["upgrade"]>[0]) => (tx: Transaction) => {
  if (Browser.extension.getBackgroundPage() === window) {
    cb(tx)
  } else throw new Error("Talisman Dexie Migration Error")
}

export class TalismanDatabase extends Dexie {
  tokenRates!: Dexie.Table<DbTokenRates, string>
  metadata!: Dexie.Table<MetadataDef, string>
  phishing!: Dexie.Table<ProtectorStorage, ProtectorSources>
  transactions!: Dexie.Table<WalletTransaction, string>

  constructor() {
    super("Talisman")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(8)
      .stores({
        // You only need to specify properties that you wish to index.
        // The object store will allow any properties on your stored objects but you can only query them by indexed properties
        // https://dexie.org/docs/API-Reference#declare-database
        //
        // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
        // https://dexie.org/docs/Version/Version.stores()#warning
        tokenRates: "tokenId",
        metadata: "genesisHash",
        phishing: "source, commitSha",
        transactions: "hash, status, timestamp",

        chains: null, // delete legacy table
        evmNetworks: null, // delete legacy table
        tokens: null, // delete legacy table

        balances: null, // delete legacy table
        metadataRpc: null, // delete legacy table
        chainMetadataRpc: null, // delete legacy table
      })
      .upgrade(inBackgroundScript(migrateExtensionDbV5ToV6))
  }
}

export const db = new TalismanDatabase()
