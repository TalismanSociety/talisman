import { filter, firstValueFrom } from "rxjs"

import type { StorageProvider } from "../../libs/Store"
import { appStore } from "../app/store.app"
import { settingsStore } from "../app/store.settings"

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
  if (await settingsStore.get("useAnalyticsTracking"))
    await settingsStore.set({ useAnalyticsTracking: false })
}

/**
 * The migration that removes the legacy analytics runs at the first unlock. Until then the engine
 * would read the consent given to the legacy analytics as granted and send to the new project, so
 * the worker runs the removal first, while the legacy queue (the marker that it never ran) exists.
 * Resolves once `settingsStore.observable` reflects the withdrawal: the store feeds it from
 * `chrome.storage.onChanged`, not from the write.
 */
export const removeLegacyAnalyticsBeforeUnlock = async () => {
  const { analytics } = await chrome.storage.local.get("analytics")
  if (analytics === undefined) return
  await removeLegacyAnalytics()
  await firstValueFrom(
    settingsStore.observable.pipe(filter((settings) => !settings.useAnalyticsTracking))
  )
}
