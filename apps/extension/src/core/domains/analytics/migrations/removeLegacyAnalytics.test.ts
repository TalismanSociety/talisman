import { beforeEach, describe, expect, it } from "vitest"

import { migrateRemoveLegacyAnalytics } from "./index"

const context = { password: "test-password" }

describe("migrateRemoveLegacyAnalytics", () => {
  beforeEach(async () => {
    await chrome.storage.local.clear()
    await chrome.storage.local.set({
      analytics: {
        distinctId: "00000000-0000-4000-8000-000000000000",
        data: [{ event: "Pageview", properties: {}, timestamp: 0 }],
      },
      app: {
        onboarded: "TRUE",
        hideGetStarted: true,
        posthogDistinctId: "00000000-0000-4000-8000-000000000001",
        analyticsReport: { accountsCount: 3 },
        analyticsReportCreatedAt: 1_700_000_000_000,
        lastWalletUpgradedEvent: "3.10.0",
      },
      settings: { useAnalyticsTracking: true },
    })
  })

  it("removes the legacy analytics queue and id", async () => {
    await expect(migrateRemoveLegacyAnalytics.forward.apply(context)).resolves.toBe(true)

    const { analytics } = await chrome.storage.local.get("analytics")
    expect(analytics).toBeUndefined()
  })

  it("removes the legacy analytics fields from the app state and keeps the others", async () => {
    await migrateRemoveLegacyAnalytics.forward.apply(context)

    const { app } = await chrome.storage.local.get("app")
    expect(app).not.toHaveProperty("posthogDistinctId")
    expect(app).not.toHaveProperty("analyticsReport")
    expect(app).not.toHaveProperty("analyticsReportCreatedAt")
    expect(app).not.toHaveProperty("lastWalletUpgradedEvent")
    expect(app).toMatchObject({ onboarded: "TRUE", hideGetStarted: true })
  })

  it.each([
    ["given", { useAnalyticsTracking: true, useErrorTracking: true }],
    ["declined", { useAnalyticsTracking: false, useErrorTracking: false }],
    ["not chosen yet", {}],
  ])("leaves a consent that was %s as it is", async (_label, stored) => {
    await chrome.storage.local.set({ settings: stored })

    await migrateRemoveLegacyAnalytics.forward.apply(context)

    const { settings } = await chrome.storage.local.get("settings")
    expect(settings).toEqual(stored)
  })
})
