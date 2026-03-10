import type { Balances } from "@talismn/balances"
import { vi } from "vitest"

vi.mock("../atoms/allAddresses", () => ({ allAddressesAtom: {} }))
vi.mock("../atoms/balances", () => ({ balancesAtom: {} }))
vi.mock("jotai", () => ({ useAtomValue: vi.fn(), useSetAtom: vi.fn() }))
vi.mock("react", () => ({ useEffect: vi.fn(), useMemo: vi.fn() }))

import { deriveBalancesStatus, getStaleChains } from "./useBalances"

const makeBalances = (
  items: Array<{ status: string; network?: { name: string }; networkId?: string }>
) => ({ each: items }) as unknown as Balances

describe("getStaleChains", () => {
  it("returns empty array when no stale balances", () => {
    const balances = makeBalances([
      { status: "live", network: { name: "Polkadot" } },
      { status: "cache", network: { name: "Kusama" } },
    ])
    expect(getStaleChains(balances)).toEqual([])
  })

  it("returns network names for stale balances", () => {
    const balances = makeBalances([
      { status: "stale", network: { name: "Polkadot" } },
      { status: "stale", network: { name: "Kusama" } },
    ])
    expect(getStaleChains(balances)).toEqual(["Polkadot", "Kusama"])
  })

  it("deduplicates network names", () => {
    const balances = makeBalances([
      { status: "stale", network: { name: "Polkadot" } },
      { status: "stale", network: { name: "Polkadot" } },
    ])
    expect(getStaleChains(balances)).toEqual(["Polkadot"])
  })

  it("falls back to networkId when network is undefined", () => {
    const balances = makeBalances([{ status: "stale", networkId: "polkadot" }])
    expect(getStaleChains(balances)).toEqual(["polkadot"])
  })

  it('falls back to "Unknown" when both network and networkId are undefined', () => {
    const balances = makeBalances([{ status: "stale" }])
    expect(getStaleChains(balances)).toEqual(["Unknown"])
  })

  it("returns empty array for empty balances", () => {
    const balances = makeBalances([])
    expect(getStaleChains(balances)).toEqual([])
  })

  it('only includes "stale" status, not "cache" or "live"', () => {
    const balances = makeBalances([
      { status: "live", network: { name: "Polkadot" } },
      { status: "cache", network: { name: "Kusama" } },
      { status: "stale", network: { name: "Acala" } },
    ])
    expect(getStaleChains(balances)).toEqual(["Acala"])
  })
})

describe("balances status derivation", () => {
  it('returns { status: "live" } when all balances are live', () => {
    const balances = makeBalances([
      { status: "live", network: { name: "Polkadot" } },
      { status: "live", network: { name: "Kusama" } },
    ])
    expect(deriveBalancesStatus(balances)).toEqual({ status: "live" })
  })

  it('returns { status: "fetching" } when any balance is cached and none stale', () => {
    const balances = makeBalances([
      { status: "live", network: { name: "Polkadot" } },
      { status: "cache", network: { name: "Kusama" } },
    ])
    expect(deriveBalancesStatus(balances)).toEqual({ status: "fetching" })
  })

  it('returns { status: "stale" } with staleChains when any balance is stale', () => {
    const balances = makeBalances([
      { status: "live", network: { name: "Polkadot" } },
      { status: "stale", network: { name: "Kusama" } },
    ])
    expect(deriveBalancesStatus(balances)).toEqual({ status: "stale", staleChains: ["Kusama"] })
  })

  it("stale takes priority over cache", () => {
    const balances = makeBalances([
      { status: "cache", network: { name: "Polkadot" } },
      { status: "stale", network: { name: "Kusama" } },
    ])
    const result = deriveBalancesStatus(balances)
    expect(result.status).toBe("stale")
    expect(result).toEqual({ status: "stale", staleChains: ["Kusama"] })
  })

  it('returns { status: "live" } for empty balances', () => {
    const balances = makeBalances([])
    expect(deriveBalancesStatus(balances)).toEqual({ status: "live" })
  })
})
