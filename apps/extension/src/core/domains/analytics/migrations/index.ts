import { type Migration, MigrationFunction } from "../../../libs/migrations/types"
import type { StorageProvider } from "../../../libs/Store"
import { appStore } from "../../app/store.app"
import { settingsStore } from "../../app/store.settings"

const legacyAppStore = appStore as unknown as StorageProvider<{
  posthogDistinctId: string
  analyticsReport: unknown
  analyticsReportCreatedAt: number
  lastWalletUpgradedEvent: string
}>

export const migratePosthogDistinctIdToAnalyticsStore: Migration = {
  forward: new MigrationFunction(async () => {}),
}

export const migrateAnaliticsPurgePendingCaptures: Migration = {
  forward: new MigrationFunction(async () => {}),
}

export const migrateRemoveLegacyAnalytics: Migration = {
  forward: new MigrationFunction(async () => {
    await chrome.storage.local.remove("analytics")
    await legacyAppStore.delete([
      "posthogDistinctId",
      "analyticsReport",
      "analyticsReportCreatedAt",
      "lastWalletUpgradedEvent",
    ])
    if (await settingsStore.get("useAnalyticsTracking"))
      await settingsStore.set({ useAnalyticsTracking: false })
  }),
}
