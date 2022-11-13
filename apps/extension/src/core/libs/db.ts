import { MetadataDef } from "@core/inject/types"
import { RuntimeVersion } from "@polkadot/types/interfaces"
import { TokenId } from "@talismn/chaindata-provider"
import { TokenRates } from "@talismn/token-rates"
import { Dexie } from "dexie"

export class TalismanDatabase extends Dexie {
  tokenRates!: Dexie.Table<DbTokenRates, string>
  metadata!: Dexie.Table<MetadataDef, string>
  chainMetadataRpc!: Dexie.Table<ChainMetadataRpc, string>

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
      chains: null,
      evmNetworks: null,
      tokens: null,
      tokenRates: "tokenId",
      balances: null,
      metadata: "genesisHash",
      metadataRpc: null,
      chainMetadataRpc: "chainId",
    })

    // init code moved to Extension.ts to prevent frontend build to have metadataInit
  }
}

export type ChainMetadataRpc = {
  chainId: string
  cacheKey: string
  metadataRpc: `0x${string}`
  runtimeVersion: RuntimeVersion
}

export type DbTokenRates = {
  tokenId: TokenId
  rates: TokenRates
}

export const db = new TalismanDatabase()
