import { beforeEach, describe, expect, test, vi } from "vitest"

import remoteConfigDefault from "../remoteConfig.default.json"
import type { RemoteConfigStoreData } from "../types"

const DEFAULT_REMOTE_CONFIG = remoteConfigDefault as RemoteConfigStoreData

const mockFetchRemoteConfig = vi.fn()
vi.mock("../remote-config/fetchRemoteConfig", () => ({
  fetchRemoteConfig: mockFetchRemoteConfig,
}))

// import after vi.mock so the mock is in place when the module loads
const { remoteConfigStore } = await import("../store.remoteConfig")

describe("RemoteConfigStore", () => {
  beforeEach(async () => {
    await chrome.storage.local.clear()
    mockFetchRemoteConfig.mockReset()
  })

  describe("resetToDefaults", () => {
    test("resets store to build-time defaults", async () => {
      // simulate stale config in storage
      await chrome.storage.local.set({
        remoteConfig: {
          ...DEFAULT_REMOTE_CONFIG,
          postHogUrl: "https://stale.posthog.url",
        },
      })

      await remoteConfigStore.resetToDefaults()

      const config = await remoteConfigStore.get()
      expect(config.postHogUrl).toBe(DEFAULT_REMOTE_CONFIG.postHogUrl)
      expect(config.featureFlags).toEqual(DEFAULT_REMOTE_CONFIG.featureFlags)
    })
  })

  describe("init", () => {
    test("merges fetched config with defaults", async () => {
      const fetchedConfig = {
        ...DEFAULT_REMOTE_CONFIG,
        featureFlags: { ...DEFAULT_REMOTE_CONFIG.featureFlags, I18N: true },
        postHogUrl: "https://fetched.posthog.url",
      }
      mockFetchRemoteConfig.mockResolvedValue(fetchedConfig)

      await remoteConfigStore.init()

      const config = await remoteConfigStore.get()
      expect(config.featureFlags.I18N).toBe(true)
      expect(config.postHogUrl).toBe("https://fetched.posthog.url")
    })

    test("keeps defaults on fetch failure", async () => {
      mockFetchRemoteConfig.mockRejectedValue(new Error("Network error"))

      await remoteConfigStore.init()

      const config = await remoteConfigStore.get()
      expect(config.featureFlags).toEqual(DEFAULT_REMOTE_CONFIG.featureFlags)
    })

    test("keeps Chrome storage config on fetch failure (normal startup)", async () => {
      const existingConfig = {
        ...DEFAULT_REMOTE_CONFIG,
        postHogUrl: "https://previously-fetched.url",
      }
      await chrome.storage.local.set({ remoteConfig: existingConfig })
      mockFetchRemoteConfig.mockRejectedValue(new Error("Network error"))

      await remoteConfigStore.init()

      const config = await remoteConfigStore.get()
      expect(config.postHogUrl).toBe("https://previously-fetched.url")
    })
  })

  describe("upgrade flow (resetToDefaults then init)", () => {
    test("resets to defaults then fetches fresh config", async () => {
      // simulate stale config from previous version
      await chrome.storage.local.set({
        remoteConfig: {
          ...DEFAULT_REMOTE_CONFIG,
          postHogUrl: "https://old-version.url",
        },
      })

      const freshConfig = {
        ...DEFAULT_REMOTE_CONFIG,
        postHogUrl: "https://fresh-from-server.url",
      }
      mockFetchRemoteConfig.mockResolvedValue(freshConfig)

      // onInstalled calls resetToDefaults, then Extension constructor calls init
      await remoteConfigStore.resetToDefaults()
      await remoteConfigStore.init()

      const config = await remoteConfigStore.get()
      expect(config.postHogUrl).toBe("https://fresh-from-server.url")
    })

    test("falls back to build-time defaults when fetch fails after upgrade", async () => {
      await chrome.storage.local.set({
        remoteConfig: {
          ...DEFAULT_REMOTE_CONFIG,
          postHogUrl: "https://old-version.url",
        },
      })
      mockFetchRemoteConfig.mockRejectedValue(new Error("Network blocked"))

      await remoteConfigStore.resetToDefaults()
      await remoteConfigStore.init()

      const config = await remoteConfigStore.get()
      expect(config.postHogUrl).toBe(DEFAULT_REMOTE_CONFIG.postHogUrl)
    })
  })
})
