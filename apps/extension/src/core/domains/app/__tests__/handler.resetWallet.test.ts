import { describe, expect, it, vi } from "vitest"

import type { ExtensionStore } from "../../../handlers/stores"
import type { Port } from "../../../types/base"
import AppHandler from "../handler"

const endSession = vi.hoisted(() => vi.fn(async () => {}))
vi.mock("../../analytics/engine", () => ({ analyticsEngine: { endSession } }))
vi.mock("../../../libs/WindowManager", () => ({
  windowManager: { openOnboarding: vi.fn(async () => {}) },
}))
vi.mock("../../keyring/store", () => ({ keyringStore: { reset: vi.fn(async () => {}) } }))

describe("AppHandler pri(app.resetWallet)", () => {
  it("ends the analytics session before it marks the wallet as not onboarded", async () => {
    const stores = {
      app: { set: vi.fn(async () => {}) },
      password: { reset: vi.fn(async () => {}) },
      quickUnlock: { unenroll: vi.fn(async () => {}) },
      sites: { clear: vi.fn(async () => {}) },
      accountsCatalog: { clear: vi.fn(async () => {}) },
    }
    const handler = new AppHandler(stores as unknown as ExtensionStore)

    await handler.handle("1", "pri(app.resetWallet)", null, {} as Port)

    expect(stores.app.set).toHaveBeenCalledWith({ onboarded: "FALSE" })
    expect(endSession.mock.invocationCallOrder[0]).toBeLessThan(
      stores.app.set.mock.invocationCallOrder[0]
    )
  })
})
