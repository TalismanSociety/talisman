import { describe, expect, it } from "vitest"

import { getProxyCountForNetwork, getProxyDeposit } from "./proxyDeposit"

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
})

describe("getProxyCountForNetwork", () => {
  it("ignores proxy sets from other networks", () => {
    expect(
      getProxyCountForNetwork(
        [
          {
            networkId: "polkadot",
            proxyCount: 5,
          },
          {
            networkId: "kusama",
            proxyCount: 2,
          },
        ],
        "polkadot"
      )
    ).toBe(5)
  })
})
