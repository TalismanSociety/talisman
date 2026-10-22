import { Twox64Concat, Twox128 } from "@polkadot-api/substrate-bindings"
import { mergeUint8, toHex } from "@polkadot-api/utils"
import { describe, expect, it } from "vitest"

import { decodeProxyCount, getProxyProxiesKey } from "./storageKeys"

describe("getProxyProxiesKey", () => {
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
