import { catalogue, type EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { sessionStorage } from "../../util/sessionStorageCompat"
import { onInstalledForAnalytics, onLockFact } from "./lifecycle"
import { analyticsLifecycleStore } from "./store.lifecycle"

type TrackedCall = [event: EventName, props?: EventProperties]

const tracked = vi.hoisted(() => {
  const calls: TrackedCall[] = []
  return { calls }
})

vi.mock("./track", () => ({
  track: (...call: TrackedCall) => {
    tracked.calls.push(call)
  },
}))

const T0 = Date.UTC(2026, 9, 2, 12)
const INSTALLED_AT = Date.UTC(2025, 0, 1)

const trackedCalls = () => tracked.calls

const expectTrackedPropsToParse = () => {
  for (const [event, props] of trackedCalls()) catalogue[event].schema.parse(props ?? {})
}

beforeAll(() => {
  Object.assign(chrome.runtime, {
    OnInstalledReason: { INSTALL: "install", UPDATE: "update", CHROME_UPDATE: "chrome_update" },
  })
})

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(T0)
  tracked.calls.length = 0
  await sessionStorage.clear()
  await analyticsLifecycleStore.clear()
})

afterEach(() => {
  expectTrackedPropsToParse()
  vi.useRealTimers()
})

describe("onLockFact", () => {
  it("reports an unlock with the reason of the lock before it", async () => {
    onLockFact({ type: "locked", reason: "manual" })
    onLockFact({ type: "unlocked", how: { method: "password", legacyPassword: false } })

    await vi.waitFor(() => expect(trackedCalls()).toHaveLength(2))
    expect(trackedCalls()).toEqual([
      ["app_locked", { reason: "manual" }],
      ["app_unlocked", { method: "password", lock_reason: "manual", legacy_password: false }],
    ])
  })

  it("reports an unlock after a restart, which cleared the lock reason", async () => {
    onLockFact({ type: "locked", reason: "auto_lock" })
    await vi.waitFor(() => expect(trackedCalls()).toHaveLength(1))
    await sessionStorage.clear()

    onLockFact({ type: "unlocked", how: { method: "quick_unlock", legacyPassword: false } })

    await vi.waitFor(() => expect(trackedCalls()).toHaveLength(2))
    expect(trackedCalls()[1]).toEqual([
      "app_unlocked",
      { method: "quick_unlock", lock_reason: "restart", legacy_password: false },
    ])
  })
})

describe("onInstalledForAnalytics", () => {
  it("records the install time and reports the install", async () => {
    await onInstalledForAnalytics({ reason: chrome.runtime.OnInstalledReason.INSTALL })

    expect(await analyticsLifecycleStore.get("installedAt")).toBe(T0)
    expect(trackedCalls()).toEqual([["app_installed"]])
  })

  it("keeps the install time across an update and reports the previous version", async () => {
    await analyticsLifecycleStore.set({ installedAt: INSTALLED_AT })

    await onInstalledForAnalytics({
      reason: chrome.runtime.OnInstalledReason.UPDATE,
      previousVersion: "3.10.0",
    })

    expect(await analyticsLifecycleStore.get("installedAt")).toBe(INSTALLED_AT)
    expect(trackedCalls()).toEqual([["app_updated", { previous_version: "3.10.0" }]])
  })

  it("dates an install that predates analytics from its update", async () => {
    await onInstalledForAnalytics({
      reason: chrome.runtime.OnInstalledReason.UPDATE,
      previousVersion: "3.10.0",
    })

    expect(await analyticsLifecycleStore.get("installedAt")).toBe(T0)
  })

  it("ignores a browser update", async () => {
    await onInstalledForAnalytics({ reason: chrome.runtime.OnInstalledReason.CHROME_UPDATE })

    expect(await analyticsLifecycleStore.get("installedAt")).toBeNull()
    expect(trackedCalls()).toEqual([])
  })
})
