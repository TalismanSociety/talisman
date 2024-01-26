import { Dexie } from "dexie"

import { DbTokenRates } from "./types"

export class TalismanTokenRatesDatabase extends Dexie {
  tokenRates!: Dexie.Table<DbTokenRates, string>

  constructor() {
    super("TalismanTokenRates")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(1).stores({
      // You only need to specify properties that you wish to index.
      // The object store will allow any properties on your stored objects but you can only query them by indexed properties
      // https://dexie.org/docs/API-Reference#declare-database
      //
      // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
      // https://dexie.org/docs/Version/Version.stores()#warning
      tokenRates: "tokenId",
    })
  }
}

export const db = new TalismanTokenRatesDatabase()
