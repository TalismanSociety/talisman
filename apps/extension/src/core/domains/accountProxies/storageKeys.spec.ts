import { Twox64Concat, Twox128 } from "@polkadot-api/substrate-bindings"
import { fromHex, mergeUint8, toHex } from "@polkadot-api/utils"
import { describe, expect, it } from "vitest"

import { decodeProxyCount, getProxyProxiesKey } from "./storageKeys"

describe("getProxyProxiesKey", () => {
  const EXPECTED_PREFIX = toHex(
    mergeUint8([
      Twox128(new TextEncoder().encode("Proxy")),
      Twox128(new TextEncoder().encode("Proxies")),
    ])
  )

  it("produces a 72-byte key for a 32-byte AccountId", () => {
    const accountId = new Uint8Array(32).fill(0xaa)
    const key = getProxyProxiesKey(accountId)
    // 16 (Twox128 Proxy) + 16 (Twox128 Proxies) + 8 (Twox64 hash) + 32 (accountId) = 72
    expect(fromHex(key).length).toBe(72)
  })

  it("starts with the correct Proxy.Proxies prefix", () => {
    const accountId = new Uint8Array(32).fill(0xbb)
    const key = getProxyProxiesKey(accountId)
    expect(key.startsWith(EXPECTED_PREFIX)).toBe(true)
  })

  it("embeds the AccountId in the suffix (Twox64Concat appends data after hash)", () => {
    const accountId = new Uint8Array(32).fill(0xcc)
    const key = getProxyProxiesKey(accountId)
    const keyBytes = fromHex(key)
    // Last 32 bytes should be the AccountId (Twox64Concat = 8-byte hash ++ data)
    const tail = keyBytes.slice(-32)
    expect(tail).toEqual(accountId)
  })

  it("matches manual Twox64Concat computation", () => {
    const accountId = new Uint8Array(32).fill(0x01)
    const expected = toHex(
      mergeUint8([
        Twox128(new TextEncoder().encode("Proxy")),
        Twox128(new TextEncoder().encode("Proxies")),
        Twox64Concat(accountId),
      ])
    )
    expect(getProxyProxiesKey(accountId)).toBe(expected)
  })

  it("produces different keys for different AccountIds", () => {
    const a = getProxyProxiesKey(new Uint8Array(32).fill(0x00))
    const b = getProxyProxiesKey(new Uint8Array(32).fill(0xff))
    expect(a).not.toBe(b)
  })
})

describe("decodeProxyCount", () => {
  it("returns 0 for null value", () => {
    expect(decodeProxyCount(null)).toBe(0)
  })

  it("returns 0 for empty hex string", () => {
    expect(decodeProxyCount("0x")).toBe(0)
  })

  it("decodes single-byte compact count of 0", () => {
    // compact(0) = 0x00
    expect(decodeProxyCount("0x00")).toBe(0)
  })

  it("decodes single-byte compact count of 1", () => {
    // compact(1) = 0x04 (1 << 2)
    expect(decodeProxyCount("0x04")).toBe(1)
  })

  it("decodes single-byte compact count of 3", () => {
    // compact(3) = 0x0c (3 << 2)
    expect(decodeProxyCount("0x0c")).toBe(3)
  })

  it("decodes single-byte compact count of 63", () => {
    // compact(63) = 0xfc (63 << 2 = 252)
    expect(decodeProxyCount("0xfc")).toBe(63)
  })

  it("decodes two-byte compact count of 64", () => {
    // compact(64) = 0x0101 (64 << 2 | 0b01 = 0x0101)
    expect(decodeProxyCount("0x0101")).toBe(64)
  })

  it("ignores trailing bytes after the compact prefix", () => {
    // compact(2) = 0x08, plus trailing garbage that mimics proxy entries
    expect(decodeProxyCount("0x08deadbeefcafebabe")).toBe(2)
  })
})
