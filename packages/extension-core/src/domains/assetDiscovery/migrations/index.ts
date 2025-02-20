import { db } from "../../../db"
import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { appStore } from "../../app/store.app"
import { assetDiscoveryStore } from "../store"

// purpose of this migration is to run an initial scan on existing accounts, when the feature is rolled out
export const migrateAssetDiscoveryRollout: Migration = {
  forward: new MigrationFunction(async () => {
    // we can't start a scan right away because chaindata will only fetch new tokens on first front end subscription
    // => flag that a scan is pending, and start it as soon as new tokens are fetched
    await appStore.set({ isAssetDiscoveryScanPending: true })
  }),
}

// purpose of this migration is clear existing stores due to property changes, and start a scan
export const migrateAssetDiscoveryV2: Migration = {
  forward: new MigrationFunction(async () => {
    await db.assetDiscovery.clear()
    await assetDiscoveryStore.reset()
    // we can't start a scan right away because chaindata will only fetch new tokens on first front end subscription
    // => flag that a scan is pending, and start it as soon as new tokens are fetched
    await appStore.set({ isAssetDiscoveryScanPending: true })
  }),
}
