import { beforeEach, describe, expect, it } from "vitest"

import {
  evmChainIdMatches,
  genesisHashMatches,
  getIdentityVerdict,
  isKnownMismatch,
  recordIdentityVerdict,
  resetIdentityVerdicts,
  withTimeout,
} from "./rpcIdentity"

const NETWORK = "polkadot"
const RPC = "wss://rpc.example/one"
const OTHER = "wss://rpc.example/two"

beforeEach(() => {
  resetIdentityVerdicts()
})

describe("genesisHashMatches", () => {
  it("compares hex hashes case-insensitively", () => {
    expect(genesisHashMatches("0xABcd", "0xabCD")).toBe(true)
    expect(genesisHashMatches("0xabcd", "0xabce")).toBe(false)
  })

  it("compares solana base58 hashes verbatim", () => {
    const hash = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
    expect(genesisHashMatches(hash, hash)).toBe(true)
    expect(genesisHashMatches(hash, "5EYKT4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d")).toBe(false)
  })
})

describe("evmChainIdMatches", () => {
  it("accepts decimal, hex and numeric answers for the same chain", () => {
    expect(evmChainIdMatches(137, "137")).toBe(true)
    expect(evmChainIdMatches(137, "0x89")).toBe(true)
    expect(evmChainIdMatches(137, 137)).toBe(true)
  })

  it("rejects another chain and garbage", () => {
    expect(evmChainIdMatches(137, "0x1")).toBe(false)
    expect(evmChainIdMatches(137, "not-a-number")).toBe(false)
    expect(evmChainIdMatches(137, null)).toBe(false)
    expect(evmChainIdMatches(137, { id: 137 })).toBe(false)
  })
})

describe("recordIdentityVerdict", () => {
  it("remembers the verdict per network and RPC", () => {
    expect(getIdentityVerdict(NETWORK, RPC)).toBeUndefined()
    recordIdentityVerdict(NETWORK, RPC, "mismatch")
    expect(getIdentityVerdict(NETWORK, RPC)).toBe("mismatch")
    expect(isKnownMismatch(NETWORK, RPC)).toBe(true)
    expect(getIdentityVerdict(NETWORK, OTHER)).toBeUndefined()
    expect(getIdentityVerdict("kusama", RPC)).toBeUndefined()
  })

  it("replaces an earlier verdict", () => {
    recordIdentityVerdict(NETWORK, RPC, "mismatch")
    recordIdentityVerdict(NETWORK, RPC, "match")
    expect(getIdentityVerdict(NETWORK, RPC)).toBe("match")
    expect(isKnownMismatch(NETWORK, RPC)).toBe(false)
  })
})

describe("withTimeout", () => {
  it("resolves with the value when it arrives in time", async () => {
    expect(await withTimeout(Promise.resolve(7), 50, "x")).toBe(7)
  })

  it("rejects with a labelled timeout otherwise", async () => {
    const never = new Promise<never>(() => {})
    await expect(withTimeout(never, 5, "chainSpec")).rejects.toThrow("timeout: chainSpec")
  })
})
