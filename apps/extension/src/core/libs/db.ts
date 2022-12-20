import { ProtectorSources, ProtectorStorage } from "@core/domains/app/protector/ParaverseProtector"
import { MetadataDef } from "@core/inject/types"
import { TokenId } from "@talismn/chaindata-provider"
import { TokenRates } from "@talismn/token-rates"
import { Dexie } from "dexie"

export class TalismanDatabase extends Dexie {
  tokenRates!: Dexie.Table<DbTokenRates, string>
  metadata!: Dexie.Table<MetadataDef, string>
  phishing!: Dexie.Table<ProtectorStorage, ProtectorSources>

  /** Chains aren't stored here anymore, we only have this so that we can migrate user's custom chains to the new chaindata database */
  chains!: Dexie.Table<unknown, string>
  /** EvmNetworks aren't stored here anymore, we only have this so that we can migrate user's custom networks to the new chaindata database */
  evmNetworks!: Dexie.Table<unknown, string>
  /** Tokens aren't stored here anymore, we only have this so that we can migrate user's custom tokens to the new chaindata database */
  tokens!: Dexie.Table<unknown, string>

  constructor() {
    super("Talisman")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(6).stores({
      // You only need to specify properties that you wish to index.
      // The object store will allow any properties on your stored objects but you can only query them by indexed properties
      // https://dexie.org/docs/API-Reference#declare-database
      //
      // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
      // https://dexie.org/docs/Version/Version.stores()#warning
      tokenRates: "tokenId",
      metadata: "genesisHash",
      phishing: "source, commitSha",

      chains: "id", // TODO: Delete later on - for now we keep it so we can migrate custom chains to the new db
      // chains: null, // delete legacy table

      evmNetworks: "id", // TODO: Delete later on - for now we keep it so we can migrate custom networks to the new db
      // evmNetworks: null, // delete legacy table

      tokens: "id", // TODO: Delete later on - for now we keep it so we can migrate custom tokens to the new db
      // tokens: null, // delete legacy table

      balances: null, // delete legacy table
      metadataRpc: null, // delete legacy table
      chainMetadataRpc: null, // delete legacy table
    })

    // data provisioning code moved to Extension.ts so only backend can execute it
  }
}

export type DbTokenRates = {
  tokenId: TokenId
  rates: TokenRates
}

export const db = new TalismanDatabase()
