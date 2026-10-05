import { beforeEach, describe, expect, it, vi } from "vitest"

import { parseTrackedEvent } from "./parse"

vi.mock("./transmission", () => ({
  TRANSMISSION: { mode: "posthog", endpoint: "https://z.talisman.xyz/batch/", apiKey: "phc_test" },
}))

const LEGACY_QUEUE = { distinctId: "00000000-0000-4000-8000-000000000000", data: [] }

describe("the worker's engine", () => {
  beforeEach(async () => {
    await chrome.storage.local.clear()
    vi.spyOn(chrome.management, "getSelf").mockRejectedValue(new Error("not in a browser"))
    vi.spyOn(chrome.runtime, "getPlatformInfo").mockRejectedValue(new Error("not in a browser"))
  })

  it("withdraws the legacy opt-in before it reads consent: app_updated before the first unlock is dropped", async () => {
    await chrome.storage.local.set({
      analytics: LEGACY_QUEUE,
      settings: { useAnalyticsTracking: true, useErrorTracking: true },
    })
    const { analyticsEngine } = await import("./engine")
    analyticsEngine.start()

    const disposition = await analyticsEngine.capture({
      result: parseTrackedEvent({
        event: "app_updated",
        properties: { previous_version: "3.10.0" },
      }),
      uiContext: "background",
      realNow: Date.now(),
    })

    expect(disposition).toBe("dropped_consent")
    expect((await analyticsEngine.inspect()).queued.usage).toBe(0)
    const { analytics, settings } = await chrome.storage.local.get(["analytics", "settings"])
    expect(analytics).toBeUndefined()
    expect(settings).toMatchObject({ useAnalyticsTracking: false })
  })
})
