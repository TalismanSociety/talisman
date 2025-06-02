import { db } from "../../../db"
import { Migration, MigrationFunction } from "../../../libs/migrations/types"

// clears existing nfts data
export const migrateNftsV2: Migration = {
  forward: new MigrationFunction(() => db.blobs.delete("nfts")),
  // no way back
}
