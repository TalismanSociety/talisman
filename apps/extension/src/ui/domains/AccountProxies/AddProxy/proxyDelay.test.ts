import { describe, expect, it } from "vitest"

import { parseProxyDelay } from "./proxyDelay"

describe("parseProxyDelay", () => {
  it("accepts canonical non-negative integer delays", () => {
    expect(parseProxyDelay("0")).toBe(0)
    expect(parseProxyDelay("42")).toBe(42)
    expect(parseProxyDelay(" 42 ")).toBe(42)
    expect(parseProxyDelay("00042")).toBe(42)
  })

  it("rejects values that Number.parseInt would silently truncate", () => {
    expect(parseProxyDelay("1e6")).toBeNull()
    expect(parseProxyDelay("1.9")).toBeNull()
    expect(parseProxyDelay("0x10")).toBeNull()
    expect(parseProxyDelay("5abc")).toBeNull()
  })

  it("rejects empty, negative, and unsafe integer delays", () => {
    expect(parseProxyDelay("")).toBeNull()
    expect(parseProxyDelay("-1")).toBeNull()
    expect(parseProxyDelay(String(Number.MAX_SAFE_INTEGER + 1))).toBeNull()
  })
})
