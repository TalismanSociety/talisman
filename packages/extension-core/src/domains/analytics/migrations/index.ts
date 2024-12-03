import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { StorageProvider } from "../../../libs/Store"
import { appStore } from "../../app/store.app"
import { analyticsStore } from "../store"

const legacyAppStore = appStore as unknown as StorageProvider<{ posthogDistinctId: string }>

export const migratePosthogDistinctIdToAnalyticsStore: Migration = {
  forward: new MigrationFunction(async () => {
    const distinctId = await legacyAppStore.get("posthogDistinctId")
    if (distinctId) await analyticsStore.set({ distinctId })
    legacyAppStore.delete("posthogDistinctId")
  }),
  backward: new MigrationFunction(async () => {
    const { distinctId } = await analyticsStore.get()
    if (distinctId) await legacyAppStore.set({ posthogDistinctId: distinctId })
    analyticsStore.delete("distinctId")
  }),
}

export const migrateAnaliticsPurgePendingCaptures: Migration = {
  forward: new MigrationFunction(async () => {
    analyticsStore.set({ data: [] })
  }),
}
