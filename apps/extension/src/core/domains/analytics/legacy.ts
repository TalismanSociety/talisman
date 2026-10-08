import type { StorageProvider } from "../../libs/Store"
import { appStore } from "../app/store.app"

const legacyAppStore = appStore as unknown as StorageProvider<{
  posthogDistinctId: string
  analyticsReport: unknown
  analyticsReportCreatedAt: number
  lastWalletUpgradedEvent: string
}>

export const removeLegacyAnalytics = async () => {
  await chrome.storage.local.remove("analytics")
  await legacyAppStore.delete([
    "posthogDistinctId",
    "analyticsReport",
    "analyticsReportCreatedAt",
    "lastWalletUpgradedEvent",
  ])
}
