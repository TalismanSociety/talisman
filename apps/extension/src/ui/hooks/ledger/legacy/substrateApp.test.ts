import { describe, expect, it } from "vitest"

import { SubstrateApp } from "./substrateApp"
import { supportedApps } from "./supportedApps"

// These are byte-identical guards for the code vendored from
// @zondax/ledger-substrate@1.1.2. If any of them break, the bytes we send to a
// legacy Ledger app (or the app we resolve for an account) have drifted from
// upstream and signing for un-migrated accounts is at risk.

describe("legacy SubstrateApp.serializePath", () => {
  it("serializes the Polkadot index-0 path m/44'/354'/0'/0'/0'", () => {
    const HARDENED = 0x80000000
    // slip0044 for Polkadot is 0x80000162 (354'); account/change/addressIndex hardened to 0
    const path = SubstrateApp.serializePath(0x80000162, HARDENED, HARDENED, HARDENED)

    expect(path).toHaveLength(20)
    // 0x8000002c | 0x80000162 | 0x80000000 | 0x80000000 | 0x80000000, little-endian
    expect(path.toString("hex")).toBe("2c00008062010080000000800000008000000080")
  })

  it("serializes the Kusama index-0 path m/44'/434'/0'/0'/0'", () => {
    const HARDENED = 0x80000000
    // slip0044 for Kusama is 0x800001b2 (434')
    const path = SubstrateApp.serializePath(0x800001b2, HARDENED, HARDENED, HARDENED)

    // 0x8000002c | 0x800001b2 | 0x80000000 | 0x80000000 | 0x80000000, little-endian
    expect(path.toString("hex")).toBe("2c000080b2010080000000800000008000000080")
  })

  it("rejects non-integer inputs", () => {
    expect(() => SubstrateApp.serializePath(0x80000162, 1.5, 0, 0)).toThrow(
      "Input must be an integer"
    )
  })
})

describe("legacy SubstrateApp.GetChunks", () => {
  it("splits messages into 250-byte chunks", () => {
    const chunks = SubstrateApp.GetChunks(Buffer.alloc(300))
    expect(chunks.map((c) => c.length)).toEqual([250, 50])
  })

  it("returns a single chunk for short messages", () => {
    const chunks = SubstrateApp.GetChunks(Buffer.alloc(10))
    expect(chunks.map((c) => c.length)).toEqual([10])
  })
})

describe("legacy supportedApps registry", () => {
  it("contains the full upstream set", () => {
    expect(supportedApps).toHaveLength(47)
  })

  it.each([
    ["Polkadot", 0x90, 0x80000162, 0],
    ["Kusama", 0x99, 0x800001b2, 2],
    ["Acala", 0x9b, 0x80000313, 10],
    ["Bittensor", 0xb4, 0x800003ed, 42],
    ["Statemine", 0x97, 0x800001b2, 2],
  ])("resolves %s to its CLA / SLIP-0044 / ss58 prefix", (name, cla, slip0044, ss58) => {
    const app = supportedApps.find((a) => a.name === name)
    expect(app).toEqual({ name, cla, slip0044, ss58_addr_type: ss58 })
  })

  it("has no duplicate CLA bytes", () => {
    const clas = supportedApps.map((a) => a.cla)
    expect(new Set(clas).size).toBe(clas.length)
  })
})
