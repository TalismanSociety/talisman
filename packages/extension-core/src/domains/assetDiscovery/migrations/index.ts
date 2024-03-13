import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { appStore } from "../../app/store.app"

// purpose of this migration is to run an initial scan on existing accounts, when the feature is rolled out
export const migrateAssetDiscoveryRollout: Migration = {
  forward: new MigrationFunction(async () => {
    // we can't start a scan right away because chaindata will only fetch new tokens on first front end subscription
    // => flag that a scan is pending, and start it as soon as new tokens are fetched
    await appStore.set({ isAssetDiscoveryScanPending: true })
  }),
}
