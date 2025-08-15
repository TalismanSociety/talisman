import { Dexie } from "dexie"

import { ProtectorSources, ProtectorStorage } from "../domains/app/protector/ParaverseProtector"
import { DiscoveredBalance } from "../domains/assetDiscovery/types"
import { TalismanMetadataDef } from "../domains/substrate/types"
import { LegacyWalletTransaction, WalletTransaction } from "../domains/transactions/types"
import { DbBlobId, DbBlobItem } from "./blobs"
import { upgradeRemoveSymbolFromNativeTokenId } from "./upgrades/2024-01-25-upgradeRemoveSymbolFromNativeTokenId"

export const MIGRATION_ERROR_MSG = "Talisman Dexie Migration Error"

class TalismanDatabase extends Dexie {
  assetDiscovery!: Dexie.Table<DiscoveredBalance, string>
  metadata!: Dexie.Table<TalismanMetadataDef, string>
  phishing!: Dexie.Table<ProtectorStorage, ProtectorSources>
  transactions!: Dexie.Table<LegacyWalletTransaction, string>
  transactionsV2!: Dexie.Table<WalletTransaction, string>
  blobs!: Dexie.Table<DbBlobItem, DbBlobId>

  constructor() {
    super("Talisman")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(8).upgrade(upgradeRemoveSymbolFromNativeTokenId)

    this.version(10)
      .stores({
        // You only need to specify properties that you wish to index.
        // The object store will allow any properties on your stored objects but you can only query them by indexed properties
        // https://dexie.org/docs/API-Reference#declare-database
        //
        // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
        // https://dexie.org/docs/Version/Version.stores()#warning
        assetDiscovery: "id, tokenId, address",
        metadata: "genesisHash",
        phishing: "source, commitSha",
        tokenRates: "tokenId",
        transactions: "hash, status, timestamp",
        blobs: "id",

        // delete legacy tables
        balances: null,
        chainMetadataRpc: null,
        chains: null,
        evmNetworks: null,
        metadataRpc: null,
        tokens: null,
      })
      .upgrade(function upgradeTokenRatesToObjects() {})

    this.version(11).stores({
      // migration is handled by the MigrationRunner, to ensure it's executed after other migrations
      transactionsV2: "id, status, timestamp",
      tokenRates: null,
    })
  }
}

export const db = new TalismanDatabase()
