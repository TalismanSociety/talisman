import { describe, expect, it } from "vitest"

import { __internal, addressToAccountId, getSystemAccountStorageKey } from "../substrate"

// Alice's public key (Polkadot/Substrate dev account).
const ALICE_SS58 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const ALICE_PUBKEY_HEX = "d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"

// Golden System.Account key for Alice, computed against `@polkadot-api/substrate-bindings`:
//   twox128("System") ++ twox128("Account") ++ blake2_128(pubkey) ++ pubkey
const ALICE_SYSTEM_ACCOUNT_KEY =
  "0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9de1e86a9a8c739864cf3cc5ec2bea59fd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

describe("getSystemAccountStorageKey", () => {
  it("matches the well-known System.Account key for Alice on Substrate", () => {
    const pubkey = hexToBytes(ALICE_PUBKEY_HEX)
    expect(getSystemAccountStorageKey(pubkey)).toBe(ALICE_SYSTEM_ACCOUNT_KEY)
  })

  it("works with 20-byte AccountId20 (secp256k1 chains)", () => {
    const accountId20 = hexToBytes("0x1111111111111111111111111111111111111111")
    const key = getSystemAccountStorageKey(accountId20)
    // 2 (0x) + 32 (System prefix) + 32 (Account prefix) + 32 (blake2_128) + 40 (accountId20 hex)
    expect(key.length).toBe(2 + 32 + 32 + 32 + 40)
    // Must end with the raw AccountId bytes (blake2_128_concat appends the raw id).
    expect(key.endsWith("1111111111111111111111111111111111111111")).toBe(true)
    // Must start with the deterministic System.Account storage prefix.
    expect(
      key.startsWith("0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9")
    ).toBe(true)
  })
})

describe("addressToAccountId", () => {
  it("decodes a substrate ss58 address to its 32-byte public key", () => {
    const bytes = addressToAccountId(ALICE_SS58, "*25519")
    expect(bytes).not.toBeNull()
    expect(bytes!.length).toBe(32)
    expect(Buffer.from(bytes!).toString("hex")).toBe(ALICE_PUBKEY_HEX)
  })

  it("decodes a 20-byte ethereum address for secp256k1 chains", () => {
    const bytes = addressToAccountId("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "secp256k1")
    expect(bytes).not.toBeNull()
    expect(bytes!.length).toBe(20)
    expect(Buffer.from(bytes!).toString("hex")).toBe("abcdefabcdefabcdefabcdefabcdefabcdefabcd")
  })

  it("returns null when the address type doesn't match the chain", () => {
    // ss58 on a secp256k1 chain
    expect(addressToAccountId(ALICE_SS58, "secp256k1")).toBeNull()
    // ethereum on a *25519 chain
    expect(addressToAccountId("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "*25519")).toBeNull()
  })

  it("returns null on malformed input", () => {
    expect(addressToAccountId("not-an-address", "*25519")).toBeNull()
    expect(addressToAccountId("0xnothex", "secp256k1")).toBeNull()
  })
})

describe("isFresh (timestamp-only TTL)", () => {
  const { isFresh } = __internal

  it("is not fresh when there's no previous timestamp", () => {
    expect(isFresh(undefined)).toBe(false)
  })

  it("is fresh within TTL", () => {
    expect(isFresh(Date.now())).toBe(true)
  })

  it("is not fresh past the TTL (> 7 days)", () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    expect(isFresh(eightDaysAgo)).toBe(false)
  })

  it("is fresh at exact boundary minus 1ms", () => {
    const justInsideTTL = Date.now() - (7 * 24 * 60 * 60 * 1000 - 1)
    expect(isFresh(justInsideTTL)).toBe(true)
  })
})
