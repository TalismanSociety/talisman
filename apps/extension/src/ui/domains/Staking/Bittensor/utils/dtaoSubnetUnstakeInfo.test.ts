import { describe, expect, it } from "vitest"

import { effectiveLockedAmount } from "./dtaoSubnetUnstakeInfo"

describe("effectiveLockedAmount", () => {
  it("uses the fresh lock when it exceeds the cached one (lock grew on-chain)", () => {
    expect(effectiveLockedAmount(100n, 150n)).toBe(150n)
  })

  it("keeps the cached lock when the fresh one is lower (avoid over-allowing / flicker)", () => {
    expect(effectiveLockedAmount(100n, 80n)).toBe(100n)
  })

  it("keeps the cached lock when fresh is equal", () => {
    expect(effectiveLockedAmount(100n, 100n)).toBe(100n)
  })

  it("falls back to the cached lock when fresh is null or undefined (not yet loaded / no API)", () => {
    expect(effectiveLockedAmount(100n, null)).toBe(100n)
    expect(effectiveLockedAmount(100n, undefined)).toBe(100n)
  })

  it("handles a zero cached lock with a fresh lock newly appearing", () => {
    expect(effectiveLockedAmount(0n, 50n)).toBe(50n)
    expect(effectiveLockedAmount(0n, 0n)).toBe(0n)
    expect(effectiveLockedAmount(0n, null)).toBe(0n)
  })
})
