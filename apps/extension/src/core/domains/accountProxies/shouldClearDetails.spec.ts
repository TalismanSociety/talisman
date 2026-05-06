import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock all heavy dependencies so the module can be imported without side effects.
vi.mock("@common/log", () => ({ log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock("@talismn/util", async (importActual) => {
  const actual = (await importActual()) as Record<string, unknown>
  return { ...actual }
})
vi.mock("../../rpcs/chaindata", () => ({
  chaindataProvider: { getNetworks$: vi.fn(), getNetworks: vi.fn() },
}))
vi.mock("../accounts/helpers", () => ({ isAccountCompatibleWithNetwork: vi.fn() }))
vi.mock("../balances/store.activeNetworks", () => ({
  activeNetworksStore: { observable: { pipe: vi.fn() } },
  isNetworkActive: vi.fn(),
}))
vi.mock("../keyring/store", () => ({
  keyringStore: { accounts$: { pipe: vi.fn() } },
}))
vi.mock("./accountProxiesProvider", () => ({
  addressToAccountId: vi.fn(),
  loadNetworkProxyDetails: vi.fn(),
  pollNetworkProxiesLightweight: vi.fn(),
}))
vi.mock("./polling", () => ({
  createPollingTrigger$: vi.fn(),
}))
vi.mock("./store.accountProxies", () => ({
  accountProxiesStore$: { subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) },
  getAccountProxySetKey: (nId: string, addr: string) => `${nId}|${addr}`,
  markAccountProxySetsStale: vi.fn(),
  storeHydrated$: { pipe: vi.fn() },
  upsertAccountProxySets: vi.fn(),
}))
vi.mock("./store.proxyPalletCache", () => ({
  getProxyPalletStatus: vi.fn(),
}))

import { shouldClearDetails } from "./accountProxies"
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
