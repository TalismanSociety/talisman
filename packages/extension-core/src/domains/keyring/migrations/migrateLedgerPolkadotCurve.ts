import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { keyringStore } from "../store"

// keyring will automatically add the missing curve property to ledger-polkadot accounts
// just need to call forceUpdate() for the keyring's storage to be updated
export const migrateLedgerPolkadotCurve: Migration = {
  forward: new MigrationFunction(() => keyringStore.forceUpdate()),
  // no way back
}
