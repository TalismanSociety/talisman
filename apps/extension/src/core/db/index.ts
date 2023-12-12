import { ProtectorSources, ProtectorStorage } from "@core/domains/app/protector/ParaverseProtector"
import { AssetDiscoveryResult } from "@core/domains/assetDiscovery/types"
import { WalletTransaction } from "@core/domains/transactions/types"
import { MetadataDef } from "@core/inject/types"
import { DbTokenRates } from "@talismn/token-rates"
import { Dexie } from "dexie"

export const MIGRATION_ERROR_MSG = "Talisman Dexie Migration Error"

export class TalismanDatabase extends Dexie {
  tokenRates!: Dexie.Table<DbTokenRates, string>
  metadata!: Dexie.Table<MetadataDef, string>
  phishing!: Dexie.Table<ProtectorStorage, ProtectorSources>
  transactions!: Dexie.Table<WalletTransaction, string>
  assetDiscovery!: Dexie.Table<AssetDiscoveryResult, string>

  constructor() {
    super("Talisman")
    // https://dexie.org/docs/Tutorial/Design#database-versioning

    this.version(5).stores({
      // You only need to specify properties that you wish to index.
      // The object store will allow any properties on your stored objects but you can only query them by indexed properties
      // https://dexie.org/docs/API-Reference#declare-database
      //
      // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
      // https://dexie.org/docs/Version/Version.stores()#warning
      chains: null, // delete legacy table
      evmNetworks: null, // delete legacy table
      tokens: null, // delete legacy table
      tokenRates: "tokenId",
      balances: null, // delete legacy table
      metadata: "genesisHash",
      phishing: "source, commitSha",
      metadataRpc: null, // delete legacy table
      chainMetadataRpc: null, // delete legacy table
    })

    this.version(6).stores({
      tokenRates: "tokenId",
      metadata: "genesisHash",
      phishing: "source, commitSha",
    })

    this.version(7).stores({
      tokenRates: "tokenId",
      metadata: "genesisHash",
      phishing: "source, commitSha",
      transactions: "hash, status, timestamp",
    })

    this.version(8).stores({
      tokenRates: "tokenId",
      metadata: "genesisHash",
      phishing: "source, commitSha",
      transactions: "hash, status, timestamp",
      assetDiscovery: "id, tokenId, address, status",
    })
  }
}

export const db = new TalismanDatabase()
