import { describe, expect, it } from "vitest"

import { getExpiryInfo } from "../expiry"

const NOW = Date.UTC(2026, 0, 1)
const NOW_SECONDS = BigInt(NOW / 1000)
const ONE_DAY = 24n * 60n * 60n

describe("getExpiryInfo", () => {
  it("returns the expiry date of a near-term permission", () => {
    const expiry = getExpiryInfo(NOW_SECONDS + ONE_DAY, NOW)

    expect(expiry.date).toEqual(new Date(NOW + 24 * 60 * 60 * 1000))
    expect(expiry.isPermanent).toBe(false)
    expect(expiry.isFarFuture).toBe(false)
  })

  it("flags a permission that lasts over a year", () => {
    expect(getExpiryInfo(NOW_SECONDS + 366n * ONE_DAY, NOW)).toMatchObject({
      isPermanent: false,
      isFarFuture: true,
    })
  })

  it("treats an out-of-range or missing expiry as permanent", () => {
    // uint48 max (permit2) and uint256 max (erc-2612) both mean 'never expires'
    expect(getExpiryInfo(2n ** 48n - 1n, NOW)).toEqual({
      date: null,
      isPermanent: true,
      isFarFuture: true,
    })
    expect(getExpiryInfo(2n ** 256n - 1n, NOW)).toMatchObject({ isPermanent: true })
    expect(getExpiryInfo(undefined, NOW)).toMatchObject({ isPermanent: true })
  })
})
