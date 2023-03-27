import { ChainId } from "@talismn/chaindata-provider"
import { Dexie } from "dexie"

type ChainPriorityRpc = {
  id: ChainId
  url: string
}
type ChainBackoffInterval = {
  id: ChainId
  interval: number
}

export class TalismanConnectionMetaDatabase extends Dexie {
  chainPriorityRpc!: Dexie.Table<ChainPriorityRpc, ChainId>
  chainBackoffInterval!: Dexie.Table<ChainBackoffInterval, ChainId>

  constructor() {
    super("TalismanConnectionMeta")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(1).stores({
      // You only need to specify properties that you wish to index.
      // The object store will allow any properties on your stored objects but you can only query them by indexed properties
      // https://dexie.org/docs/API-Reference#declare-database
      //
      // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
      // https://dexie.org/docs/Version/Version.stores()#warning
      chainPriorityRpc: "id",
      chainBackoffInterval: "id",
    })
  }
}

export const db = new TalismanConnectionMetaDatabase()
