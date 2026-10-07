import { beforeEach, describe, expect, it } from "vitest"

import { settingsStore } from "../app/store.settings"
import { removeLegacyAnalyticsBeforeUnlock } from "./legacy"

const LEGACY_QUEUE = { distinctId: "00000000-0000-4000-8000-000000000000", data: [] }

describe("removeLegacyAnalyticsBeforeUnlock", () => {
  beforeEach(() => chrome.storage.local.clear())

  it("without the legacy queue: changes nothing, so a consent given to the new analytics stays", async () => {
    await chrome.storage.local.set({ settings: { useAnalyticsTracking: true } })

    await removeLegacyAnalyticsBeforeUnlock()

    const { analytics, settings } = await chrome.storage.local.get(["analytics", "settings"])
    expect(analytics).toBeUndefined()
    expect(settings).toEqual({ useAnalyticsTracking: true })
  })

  it("with the legacy queue: withdraws the consent and removes the queue", async () => {
    await chrome.storage.local.set({
      analytics: LEGACY_QUEUE,
      settings: { useAnalyticsTracking: true },
    })

    await removeLegacyAnalyticsBeforeUnlock()

    const { analytics, settings } = await chrome.storage.local.get(["analytics", "settings"])
    expect(analytics).toBeUndefined()
    expect(settings).toMatchObject({ useAnalyticsTracking: false })
  })

  it("a consent given again after the withdrawal survives the next start", async () => {
    await chrome.storage.local.set({
      analytics: LEGACY_QUEUE,
      settings: { useAnalyticsTracking: true },
    })
    await removeLegacyAnalyticsBeforeUnlock()
    await settingsStore.set({ useAnalyticsTracking: true })

    await removeLegacyAnalyticsBeforeUnlock()

    expect(await settingsStore.get("useAnalyticsTracking")).toBe(true)
  })
})
