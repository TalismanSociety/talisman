import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mock dependencies ──────────────────────────────────────────────

vi.mock("../../../config/sentry", () => ({
  sentry: { captureException: vi.fn() },
}))

vi.mock("../../../rpcs/chaindata", () => ({ chaindataProvider: {} }))
vi.mock("../../chains/store.activeChains", () => ({ activeChainsStore: {} }))
vi.mock("../../ethereum/store.activeEvmNetworks", () => ({ activeEvmNetworksStore: {} }))
vi.mock("../store.addressBook", () => ({ addressBookStore: {} }))

const settings: Record<string, unknown> = {}
vi.mock("../store.settings", () => ({
  settingsStore: {
    get: vi.fn(async (key: string) => settings[key]),
    set: vi.fn(async (data: Record<string, unknown>) => {
      Object.assign(settings, data)
    }),
  },
}))

const legacySettings: Record<string, unknown> = {}
vi.mock("../../../libs/Store", () => ({
  StorageProvider: class {
    async get(key: string) {
      return legacySettings[key]
    }
    async set(data: Record<string, unknown>) {
      Object.assign(legacySettings, data)
    }
    async delete(key: string) {
      delete legacySettings[key]
    }
  },
}))

// ── Import SUT after mocks ──────────────────────────────────────────

const { migrateAutoLockTimeoutToMinutes, repairAutoLockMinutes } = await import("./index")
const { settingsStore } = await import("../store.settings")

const context = { password: "test-password" }

describe("auto-lock migrations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(settings)) delete settings[key]
    for (const key of Object.keys(legacySettings)) delete legacySettings[key]
  })

  describe("migrateAutoLockTimeoutToMinutes", () => {
    it("converts a stored legacy duration to minutes", async () => {
      legacySettings.autoLockTimeout = 900

      await migrateAutoLockTimeoutToMinutes.forward.apply(context)

      expect(settingsStore.set).toHaveBeenCalledWith({ autoLockMinutes: 15 })
    })

    it("keeps a legacy 0 (auto-lock disabled)", async () => {
      legacySettings.autoLockTimeout = 0

      await migrateAutoLockTimeoutToMinutes.forward.apply(context)

      expect(settingsStore.set).toHaveBeenCalledWith({ autoLockMinutes: 0 })
    })

    // dividing an absent setting by 60 gave NaN, which persisted as "auto-lock disabled"
    it("writes nothing when the legacy setting was never stored", async () => {
      expect(await migrateAutoLockTimeoutToMinutes.forward.apply(context)).toBe(true)

      expect(settingsStore.set).not.toHaveBeenCalled()
      expect(settings.autoLockMinutes).toBeUndefined()
    })
  })

  describe("repairAutoLockMinutes", () => {
    it.each([
      ["null", null],
      ["NaN", Number.NaN],
      ["undefined", undefined],
      ["a negative duration", -1],
      ["a non-number", "15"],
    ])("restores the default when the stored duration is %s", async (_label, stored) => {
      settings.autoLockMinutes = stored

      await repairAutoLockMinutes.forward.apply(context)

      expect(settingsStore.set).toHaveBeenCalledWith({ autoLockMinutes: 15 })
    })

    it("leaves a valid duration untouched", async () => {
      settings.autoLockMinutes = 5

      await repairAutoLockMinutes.forward.apply(context)

      expect(settingsStore.set).not.toHaveBeenCalled()
      expect(settings.autoLockMinutes).toBe(5)
    })

    it("leaves an explicit 0 untouched (user disabled auto-lock)", async () => {
      settings.autoLockMinutes = 0

      await repairAutoLockMinutes.forward.apply(context)

      expect(settingsStore.set).not.toHaveBeenCalled()
      expect(settings.autoLockMinutes).toBe(0)
    })
  })
})
