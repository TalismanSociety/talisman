import { Dexie } from "dexie"

import { MiniMetadata } from "./types"
import { upgradeBalancesDataBlob, upgradeRemoveSymbolFromNativeTokenId } from "./upgrades"

export class TalismanBalancesDatabase extends Dexie {
  balancesBlob!: Dexie.Table<{ data: Uint8Array; id: string }, string>
  miniMetadatas!: Dexie.Table<MiniMetadata, string>

  constructor() {
    super("TalismanBalances")
    // https://dexie.org/docs/Tutorial/Design#database-versioning
    // You only need to specify properties that you wish to index.

    // The object store will allow any properties on your stored objects but you can only query them by indexed properties
    // https://dexie.org/docs/API-Reference#declare-database
    //
    // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
    // https://dexie.org/docs/Version/Version.stores()#warning

    this.version(5).stores({
      balancesBlob: "id",
      miniMetadatas: "id, source, chainId, specName, specVersion",
      balances: null,
    })

    this.version(4)
      .stores({
        balances: "id",
        balancesBlob: "id",
        miniMetadatas: "id, source, chainId, specName, specVersion",
      })
      .upgrade(upgradeBalancesDataBlob)

    this.version(3)
      .stores({
        balances: "id, source, address, tokenId",
        miniMetadatas: "id, source, chainId, specName, specVersion",
      })
      .upgrade(upgradeRemoveSymbolFromNativeTokenId)
  }
}

export const db = new TalismanBalancesDatabase()
