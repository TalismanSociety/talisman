import {
  migratePolkadotLedgerAccounts,
  migrateToNewAccountTypes,
} from "../../domains/accounts/migrations"
import { cleanBadContacts } from "../../domains/app/migrations"
import { migrateAssetDiscoveryRollout } from "../../domains/assetDiscovery/migrations"
import { migrateToNewDefaultEvmNetworks } from "../../domains/ethereum/migrations"
import { migrateSeedStoreToMultiple } from "../../domains/mnemonics/migrations"
import { Migrations } from "./types"

export { MigrationRunner } from "./runner"

// The order of these migrations can never be changed after they have been released.
export const migrations: Migrations = [
  migrateSeedStoreToMultiple,
  migrateToNewAccountTypes,
  migrateToNewDefaultEvmNetworks,
  migrateAssetDiscoveryRollout,
  cleanBadContacts,
  migratePolkadotLedgerAccounts,
]
