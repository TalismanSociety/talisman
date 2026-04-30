import { describe, expect, it } from "vitest"

import { decodeProxiesValue } from "./accountProxiesProvider"

describe("decodeProxiesValue", () => {
  it("returns the runtime default when raw is null", () => {
    const fakeCodec = { value: { dec: () => [[], 0n] } }
    expect(decodeProxiesValue(null, fakeCodec)).toEqual({ deposit: 0n, proxies: [] })
  })

  it("decodes a single Any proxy with delay 0", () => {
    const fakeCodec = {
      value: {
        dec: () => [[{ delegate: "0xdead", proxy_type: { tag: "Any" }, delay: 0 }], 1_002_005_000n],
      },
    }
    const out = decodeProxiesValue("0x00", fakeCodec)
    expect(out.deposit).toBe(1_002_005_000n)
    expect(out.proxies).toEqual([{ delegate: "0xdead", proxyType: "Any", delay: "0" }])
  })

  it("decodes multiple proxies with non-zero delay", () => {
    const fakeCodec = {
      value: {
        dec: () => [
          [
            { delegate: "0xaaaa", proxy_type: "Governance", delay: 600 },
            { delegate: "0xbbbb", proxy_type: { tag: "Staking" }, delay: 0n },
          ],
          5_000_000_000n,
        ],
      },
    }
    const out = decodeProxiesValue("0x00", fakeCodec)
    expect(out.proxies).toEqual([
      { delegate: "0xaaaa", proxyType: "Governance", delay: "600" },
      { delegate: "0xbbbb", proxyType: "Staking", delay: "0" },
    ])
    expect(out.deposit).toBe(5_000_000_000n)
  })

  it("falls back to camelCase proxy_type if snake_case is missing", () => {
    const fakeCodec = {
      value: {
        dec: () => [[{ delegate: "0xcc", proxyType: "NonTransfer", delay: 0 }], 0n],
      },
    }
    const out = decodeProxiesValue("0x00", fakeCodec)
    expect(out.proxies[0].proxyType).toBe("NonTransfer")
  })
})
