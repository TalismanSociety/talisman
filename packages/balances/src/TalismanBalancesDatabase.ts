import { Dexie } from "dexie"

import { BalanceJson, MiniMetadata } from "./types"
import { upgradeRemoveSymbolFromNativeTokenId } from "./upgrades"

export class TalismanBalancesDatabase extends Dexie {
  balances!: Dexie.Table<BalanceJson, string>
  miniMetadatas!: Dexie.Table<MiniMetadata, string>

  constructor() {
    super("TalismanBalances")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(3)
      .stores({
        // You only need to specify properties that you wish to index.
        // The object store will allow any properties on your stored objects but you can only query them by indexed properties
        // https://dexie.org/docs/API-Reference#declare-database
        //
        // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
        // https://dexie.org/docs/Version/Version.stores()#warning
        balances: "id, source, status, address, tokenId",
        miniMetadatas: "id, source, chainId, specName, specVersion",
      })
      .upgrade(upgradeRemoveSymbolFromNativeTokenId)
  }
}

export const db = new TalismanBalancesDatabase()
