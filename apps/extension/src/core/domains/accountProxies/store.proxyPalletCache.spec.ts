import { describe, expect, it } from "vitest"

// Test sanitiseCache logic directly by importing the module's internal behavior.
// We test the public API: getProxyPalletStatus / setProxyPalletStatus.

// We need to isolate the module from its walletReady side-effects, so we mock the
// blob store and walletReady, then import the module fresh.
import { beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  blobStoreGet: vi.fn(),
  blobStoreSet: vi.fn(),
}))

vi.mock("../../db", () => ({
  getBlobStore: () => ({
    get: mocks.blobStoreGet,
    set: mocks.blobStoreSet,
  }),
}))

// walletReady must never resolve so side-effects don't interfere
vi.mock("../../libs/isWalletReady", () => ({
  walletReady: new Promise(() => {}),
}))

import { getProxyPalletStatus, setProxyPalletStatus } from "./store.proxyPalletCache"

describe("store.proxyPalletCache", () => {
  beforeEach(() => {
    mocks.blobStoreGet.mockReset()
    mocks.blobStoreSet.mockReset()
  })

  describe("setProxyPalletStatus + getProxyPalletStatus", () => {
    it("returns undefined when no entry exists", () => {
      expect(getProxyPalletStatus("unknown-network", 1)).toBeUndefined()
    })

    it("returns undefined when specVersion is undefined", () => {
      setProxyPalletStatus("polkadot", 100, true, "probe")
      expect(getProxyPalletStatus("polkadot", undefined)).toBeUndefined()
    })

    it("returns true after setting hasProxyPallet: true", () => {
      setProxyPalletStatus("polkadot", 100, true, "probe")
      expect(getProxyPalletStatus("polkadot", 100)).toBe(true)
    })

    it("returns false after metadata-derived absence", () => {
      setProxyPalletStatus("acala", 200, false, "metadata")
      expect(getProxyPalletStatus("acala", 200)).toBe(false)
    })

    it("returns undefined when specVersion doesn't match", () => {
      setProxyPalletStatus("polkadot", 100, true, "probe")
      expect(getProxyPalletStatus("polkadot", 101)).toBeUndefined()
    })
  })
})
