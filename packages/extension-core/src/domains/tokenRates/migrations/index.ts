import { db } from "../../../db"
import { Migration, MigrationFunction } from "../../../libs/migrations/types"

export const migrateTokenRates: Migration = {
  forward: new MigrationFunction(() => db.tokenRates.clear()),
  // no way back
}
