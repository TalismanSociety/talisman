import { db } from "../../../db"
import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { settingsStore } from "../../app/store.settings"

// clears existing nfts data
export const migrateNftsV2: Migration = {
  forward: new MigrationFunction(async () => {
    await db.blobs.delete("nfts")
    await settingsStore.mutate((prev) => ({
      ...prev,
      nftsSortBy: "value",
    }))
  }),
  // no way back
}
