import { base58, hex } from "@scure/base"
import { describe, expect, it } from "vitest"

import { addressFromPublicKey } from "../address"
import { getPublicKeyFromSecret, parseSecretKey } from "./utils"

// the first Anvil / Hardhat development key
const KEY_HEX = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const KEY_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const KEY_BYTES = hex.decode(KEY_HEX)

describe("parseSecretKey (ethereum)", () => {
  it("decodes 32-byte hex with or without the 0x prefix, in either case", () => {
    expect(parseSecretKey(KEY_HEX, "ethereum")).toEqual(KEY_BYTES)
    expect(parseSecretKey(`0x${KEY_HEX}`, "ethereum")).toEqual(KEY_BYTES)
    expect(parseSecretKey(KEY_HEX.toUpperCase(), "ethereum")).toEqual(KEY_BYTES)
  })

  it("ignores surrounding whitespace", () => {
    expect(parseSecretKey(` 0x${KEY_HEX}\n`, "ethereum")).toEqual(KEY_BYTES)
  })

  it("returns the key of the expected account", () => {
    const publicKey = getPublicKeyFromSecret(parseSecretKey(KEY_HEX, "ethereum"), "ethereum")
    expect(addressFromPublicKey(publicKey, "ethereum")).toBe(KEY_ADDRESS)
  })

  it("rejects odd-length hex instead of dropping the trailing nibble", () => {
    expect(() => parseSecretKey(`${KEY_HEX}a`, "ethereum")).toThrow()
  })

  it("rejects non-hex characters instead of truncating at them", () => {
    expect(() => parseSecretKey(`${KEY_HEX.slice(0, 62)}zz`, "ethereum")).toThrow()
  })

  it("rejects hex that is not exactly 32 bytes", () => {
    expect(() => parseSecretKey(KEY_HEX.slice(0, 62), "ethereum")).toThrow(/length/)
    expect(() => parseSecretKey(`${KEY_HEX}00`, "ethereum")).toThrow(/length/)
    expect(() => parseSecretKey("", "ethereum")).toThrow(/length/)
  })
})

describe("parseSecretKey (solana)", () => {
  const secret = Uint8Array.from({ length: 32 }, (_, i) => i + 1)
  const publicKey = getPublicKeyFromSecret(secret, "solana")
  const keypair = Uint8Array.from([...secret, ...publicKey])

  it("decodes a 32-byte base58 secret", () => {
    expect(parseSecretKey(base58.encode(secret), "solana")).toEqual(secret)
  })

  it("decodes a 64-byte keypair whose public key matches, as base58 or a JSON array", () => {
    expect(parseSecretKey(base58.encode(keypair), "solana")).toEqual(secret)
    expect(parseSecretKey(JSON.stringify([...keypair]), "solana")).toEqual(secret)
    expect(parseSecretKey(`[${[...keypair].join(", ")}]`, "solana")).toEqual(secret)
  })

  it("ignores surrounding whitespace", () => {
    expect(parseSecretKey(` ${base58.encode(keypair)}\n`, "solana")).toEqual(secret)
    expect(parseSecretKey(`\n${JSON.stringify([...keypair])} `, "solana")).toEqual(secret)
  })

  it("rejects a 64-byte keypair whose embedded public key does not match", () => {
    const tampered = Uint8Array.from(keypair)
    tampered[63] = (tampered[63] ?? 0) ^ 1
    expect(() => parseSecretKey(base58.encode(tampered), "solana")).toThrow(
      /public key does not match/
    )
  })

  it("rejects a JSON array of nulls rather than importing the all-zero key", () => {
    expect(() => parseSecretKey(JSON.stringify(new Array(32).fill(null)), "solana")).toThrow(
      /integers 0\.\.255/
    )
  })

  it("rejects JSON array elements that are not integers 0..255", () => {
    const withFraction = [...secret.slice(0, 31), 1.5]
    const outOfRange = [...secret.slice(0, 31), 256]
    const negative = [...secret.slice(0, 31), -1]
    const strings = [...secret.slice(0, 31), "7"]
    for (const bad of [withFraction, outOfRange, negative, strings])
      expect(() => parseSecretKey(JSON.stringify(bad), "solana")).toThrow(/integers 0\.\.255/)
  })

  it("rejects the wrong length", () => {
    expect(() => parseSecretKey(base58.encode(secret.slice(0, 31)), "solana")).toThrow(/length/)
    expect(() => parseSecretKey(JSON.stringify([...secret, 1]), "solana")).toThrow(/length/)
  })

  it("rejects malformed JSON", () => {
    expect(() => parseSecretKey("[1, 2", "solana")).toThrow(/JSON array/)
  })
})

describe("parseSecretKey (other platforms)", () => {
  it("rejects platforms without a raw private key import", () => {
    expect(() => parseSecretKey(KEY_HEX, "polkadot")).toThrow("Not implemented")
  })
})
