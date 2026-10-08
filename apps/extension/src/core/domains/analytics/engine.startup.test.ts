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

  it("keeps the opt-in given before the upgrade: app_updated before the first unlock is queued", async () => {
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

    expect(disposition).toBe("queued")
    const { consent, queued } = await analyticsEngine.inspect()
    expect(consent).toEqual({ usage: "granted", error: "granted" })
    expect(queued.usage).toBe(1)
    const { settings } = await chrome.storage.local.get("settings")
    expect(settings).toEqual({ useAnalyticsTracking: true, useErrorTracking: true })
  })
})
