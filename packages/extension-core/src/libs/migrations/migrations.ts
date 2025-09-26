import {
  migratePolkadotLedgerAccounts,
  migrateToNewAccountTypes,
} from "../../domains/accounts/migrations"
import {
  migrateAnaliticsPurgePendingCaptures,
  migratePosthogDistinctIdToAnalyticsStore,
} from "../../domains/analytics/migrations"
import {
  cleanBadContacts,
  hideGetStartedIfFunded,
  migrateAutoLockTimeoutToMinutes,
  migrateEnabledTestnets,
} from "../../domains/app/migrations"
import {
  migrateAssetDiscoveryRollout,
  migrateAssetDiscoveryV2,
} from "../../domains/assetDiscovery/migrations"
import { migrateToChaindataV4 } from "../../domains/chaindata/migrations/migrateToChaindataV4"
import { migrateToNewDefaultEvmNetworks } from "../../domains/ethereum/migrations"
import { migrateFromPjsKeyring, migrateLedgerPolkadotCurve } from "../../domains/keyring/migrations"
import { migrateSeedStoreToMultiple } from "../../domains/mnemonics/migrations"
import { migrateNftsV2 } from "../../domains/nfts/migrations/migrateNftsV2"
import {
  migrateSubstrateTokensIds,
  migrateTransactionsV2,
} from "../../domains/transactions/migrations"
import { Migrations } from "./types"

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
  migrateAutoLockTimeoutToMinutes,
  migrateAnaliticsPurgePendingCaptures,
  migrateAssetDiscoveryV2,
  migrateFromPjsKeyring,
  migrateEnabledTestnets,
  migrateSubstrateTokensIds,
  migrateLedgerPolkadotCurve,
  migrateToChaindataV4,
  migrateTransactionsV2,
  migrateNftsV2,
]

// @dev snippet to use in dev console of background worker to remove a migration:
// const state = await chrome.storage.local.get("migrations")
// delete state.migrations["15"] // CHANGE THIS TO YOUR MIGRATION'S INDEX
// await chrome.storage.local.set(state)
// warning: this will remove the record of the migration's application, but will not revert changes made by the migration
// it should only be used for idempotent or non-reversible migrations
