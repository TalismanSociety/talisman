import { Dexie } from "dexie"

import { AnyMiniMetadata } from "../chaindata"
import { Network, NetworkId } from "../chaindata/networks"
import { Token, TokenId } from "../chaindata/tokens"

export class ChaindataDb extends Dexie {
  tokens!: Dexie.Table<Token, TokenId>
  networks!: Dexie.Table<Network, NetworkId>
  miniMetadatas!: Dexie.Table<AnyMiniMetadata, string>

  constructor() {
    super("TalismanChaindataV4")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(1).stores({
      // You only need to specify properties that you wish to index.
      // The object store will allow any properties on your stored objects but you can only query them by indexed properties
      // https://dexie.org/docs/API-Reference#declare-database
      //
      // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
      // https://dexie.org/docs/Version/Version.stores()#warning
      networks: "id, genesisHash, platform",
      tokens: "id, type, networkId, platform",
      miniMetadatas: "id",
    })
  }
}

export const chaindataDb = new ChaindataDb()
