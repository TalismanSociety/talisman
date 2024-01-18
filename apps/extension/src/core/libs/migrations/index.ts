import { migrateToNewAccountTypes } from "@core/domains/accounts/migrations"
import { migrateAssetDiscoveryRollout } from "@core/domains/assetDiscovery/migrations"
import { migrateToNewDefaultEvmNetworks } from "@core/domains/ethereum/migrations"
import { migrateSeedStoreToMultiple } from "@core/domains/mnemonics/migrations"

import { Migrations } from "./types"

export { MigrationRunner } from "./runner"

// The order of these migrations can never be changed after they have been released.
export const migrations: Migrations = [
  migrateSeedStoreToMultiple,
  migrateToNewAccountTypes,
  migrateToNewDefaultEvmNetworks,
  migrateAssetDiscoveryRollout,
]
