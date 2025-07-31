import { Dexie } from "dexie"

import { AnyMiniMetadata } from "../chaindata"
import { Network, NetworkId } from "../chaindata/networks"
import { Token, TokenId } from "../chaindata/tokens"

class OldChaindataDb extends Dexie {
  tokens!: Dexie.Table<Token, TokenId>
  networks!: Dexie.Table<Network, NetworkId>
  miniMetadatas!: Dexie.Table<AnyMiniMetadata, string>

  constructor() {
    super("TalismanChaindataV4")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(2).stores({
      // clear old tables (we store chaindata in extension blob storage now, see `packages/extension-core/src/db/db.ts`)
      networks: null,
      tokens: null,
      miniMetadatas: null,
    })
  }
}

const oldChaindataDb = new OldChaindataDb()

export const tryToDeleteOldChaindataDb = () => {
  try {
    // try and delete it if it's still there
    oldChaindataDb.delete()
  } catch {
    // dont care if it fails
  }
}
