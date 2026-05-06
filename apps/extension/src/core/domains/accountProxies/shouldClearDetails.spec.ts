import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock the heavy dependencies that store.accountProxies pulls in transitively.
vi.mock("@common/log", () => ({ log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock("../../db", () => ({
  getBlobStore: () => ({ get: vi.fn(), set: vi.fn() }),
}))
vi.mock("../../libs/isWalletReady", () => ({ walletReady: new Promise(() => {}) }))
vi.mock("../keyring/store", () => ({
  keyringStore: { getAccounts: vi.fn() },
}))

import { shouldClearDetails } from "./store.accountProxies"
import type { AccountProxySet } from "./types"

describe("shouldClearDetails", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns true when existing entry is undefined (new delegator)", () => {
    expect(shouldClearDetails(undefined, 2)).toBe(true)
  })

  it("returns true when proxy count changed", () => {
    const existing: AccountProxySet = {
      delegator: "0x1",
      networkId: "polkadot",
      proxyCount: 2,
      deposit: "1000",
      isStale: false,
      proxies: [{ delegate: "0x2", proxyType: "Any", delay: "0" }],
      lastDetailsFetchedAt: Date.now(),
    }
    expect(shouldClearDetails(existing, 3)).toBe(true)
  })

  it("returns false when count unchanged and details are fresh", () => {
    const existing: AccountProxySet = {
      delegator: "0x1",
      networkId: "polkadot",
      proxyCount: 2,
      deposit: "1000",
      isStale: false,
      proxies: [{ delegate: "0x2", proxyType: "Any", delay: "0" }],
      lastDetailsFetchedAt: Date.now() - 10 * 60 * 1000, // 10 min ago
    }
    expect(shouldClearDetails(existing, 2)).toBe(false)
  })

  it("returns true when count unchanged but details expired past TTL", () => {
    const existing: AccountProxySet = {
      delegator: "0x1",
      networkId: "polkadot",
      proxyCount: 2,
      deposit: "1000",
      isStale: false,
      proxies: [{ delegate: "0x2", proxyType: "Any", delay: "0" }],
      lastDetailsFetchedAt: Date.now() - 31 * 60 * 1000, // 31 min ago (TTL is 30 min)
    }
    expect(shouldClearDetails(existing, 2)).toBe(true)
  })

  it("returns false when details are empty (no proxies loaded yet)", () => {
    const existing: AccountProxySet = {
      delegator: "0x1",
      networkId: "polkadot",
      proxyCount: 2,
      deposit: "0",
      isStale: false,
      proxies: [],
      lastDetailsFetchedAt: undefined,
    }
    expect(shouldClearDetails(existing, 2)).toBe(false)
  })

  it("returns false when lastDetailsFetchedAt is undefined but proxies exist", () => {
    // Backward compat: old entries without the timestamp field
    const existing: AccountProxySet = {
      delegator: "0x1",
      networkId: "polkadot",
      proxyCount: 2,
      deposit: "1000",
      isStale: false,
      proxies: [{ delegate: "0x2", proxyType: "Any", delay: "0" }],
    }
    expect(shouldClearDetails(existing, 2)).toBe(false)
  })

  it("returns true at exactly the TTL boundary", () => {
    const existing: AccountProxySet = {
      delegator: "0x1",
      networkId: "polkadot",
      proxyCount: 2,
      deposit: "1000",
      isStale: false,
      proxies: [{ delegate: "0x2", proxyType: "Any", delay: "0" }],
      lastDetailsFetchedAt: Date.now() - 30 * 60 * 1000 - 1, // 1ms past TTL
    }
    expect(shouldClearDetails(existing, 2)).toBe(true)
  })
})
