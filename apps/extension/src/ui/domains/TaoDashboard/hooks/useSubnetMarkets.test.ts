import { describe, expect, it } from "vitest"

import { getSubnetMarkets } from "./useSubnetMarkets"

const TAO = 1_000_000_000n

const dynamicInfo = (netuid: number, taoInEmission: bigint) => ({
  netuid,
  alpha_in: 3n * TAO,
  alpha_out: 1n * TAO,
  tao_in: 5n * TAO,
  tao_in_emission: taoInEmission,
})

describe("getSubnetMarkets", () => {
  it("prices every subnet with a dynamic info and a pool price", () => {
    const markets = getSubnetMarkets({
      dynamicInfos: [
        dynamicInfo(0, 0n),
        dynamicInfo(1, 100n),
        undefined,
        dynamicInfo(3, 300n),
        dynamicInfo(4, 200n),
        dynamicInfo(6, 200n),
        null,
      ],
      alphaPrices: [
        { netuid: 0, price: TAO },
        { netuid: 1, price: TAO / 2n },
        { netuid: 3, price: 2n * TAO },
        { netuid: 4, price: TAO },
        { netuid: 5, price: TAO },
      ],
      excessTaoByNetuid: new Map([
        [1, 100n],
        [3, 100n],
      ]),
    })

    expect(markets).toEqual(
      new Map([
        [0, { priceTao: 1, stakedTao: 5, stakedAlpha: 1, mcapTao: null, emissionPct: 0 }],
        [1, { priceTao: 0.5, stakedTao: 5, stakedAlpha: 1, mcapTao: 2, emissionPct: 20 }],
        [3, { priceTao: 2, stakedTao: 5, stakedAlpha: 1, mcapTao: 8, emissionPct: 40 }],
        [4, { priceTao: 1, stakedTao: 5, stakedAlpha: 1, mcapTao: 4, emissionPct: 20 }],
      ])
    )
  })

  it("gives every subnet a zero emission share when nothing is emitted", () => {
    const markets = getSubnetMarkets({
      dynamicInfos: [dynamicInfo(1, 0n), dynamicInfo(2, 0n)],
      alphaPrices: [
        { netuid: 1, price: TAO },
        { netuid: 2, price: TAO },
      ],
      excessTaoByNetuid: new Map(),
    })

    expect([...markets.values()].map(({ emissionPct }) => emissionPct)).toEqual([0, 0])
  })
})
