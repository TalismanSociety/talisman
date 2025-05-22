import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { keyringStore } from "../store"

export const migrateLedgerPolkadotCurve: Migration = {
  forward: new MigrationFunction(() => keyringStore.migrateLedgerPolkadotCurve()),
  // no way back
}
