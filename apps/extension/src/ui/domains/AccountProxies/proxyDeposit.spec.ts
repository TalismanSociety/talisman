import { describe, expect, it } from "vitest"

import { getProxyDeposit } from "./proxyDeposit"

describe("getProxyDeposit", () => {
  const base = 20n
  const factor = 5n

  it("returns zero when there are no proxies", () => {
    expect(getProxyDeposit(0, base, factor)).toBe(0n)
  })

  it("includes the base deposit once proxies exist", () => {
    expect(getProxyDeposit(1, base, factor)).toBe(25n)
    expect(getProxyDeposit(2, base, factor)).toBe(30n)
  })

  it("supports incremental reserve and release calculations", () => {
    const firstProxyReserve = getProxyDeposit(1, base, factor) - getProxyDeposit(0, base, factor)
    const secondProxyReserve = getProxyDeposit(2, base, factor) - getProxyDeposit(1, base, factor)
    const secondProxyRelease = getProxyDeposit(2, base, factor) - getProxyDeposit(1, base, factor)
    const lastProxyRelease = getProxyDeposit(1, base, factor) - getProxyDeposit(0, base, factor)

    expect(firstProxyReserve).toBe(25n)
    expect(secondProxyReserve).toBe(5n)
    expect(secondProxyRelease).toBe(5n)
    expect(lastProxyRelease).toBe(25n)
  })
})
