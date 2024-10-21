import {
  migratePolkadotLedgerAccounts,
  migrateToNewAccountTypes,
} from "../../domains/accounts/migrations"
import { migratePosthogDistinctIdToAnalyticsStore } from "../../domains/analytics/migrations"
import { cleanBadContacts, hideGetStartedIfFunded } from "../../domains/app/migrations"
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
  migratePosthogDistinctIdToAnalyticsStore,
  hideGetStartedIfFunded,
]

// @dev snippet to use in dev console of background worker to remove a migration:
// const state = await chrome.storage.local.get("migrations")
// delete state.migrations["7"] // CHANGE THIS TO YOUR MIGRATION'S INDEX
// await chrome.storage.local.set(state)
