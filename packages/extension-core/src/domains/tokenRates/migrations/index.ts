import { db } from "../../../db"
import { Migration, MigrationFunction } from "../../../libs/migrations/types"

export const migrateTokenRates: Migration = {
  forward: new MigrationFunction(async (_context) => {
    await db.tokenRates.clear()
  }),
  // no way back
}
