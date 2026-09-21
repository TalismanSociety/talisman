import { describe, expect, it } from "vitest"

import { type BasketHoldingEntry, getBasketHoldingsBreakdown } from "./basketHoldings"

describe("getBasketHoldingsBreakdown", () => {
  it("returns null for an empty fund", () => {
    expect(getBasketHoldingsBreakdown([])).toBeNull()
  })

  it("returns null when no holding has realizable value", () => {
    expect(
      getBasketHoldingsBreakdown([
        [3, 500n, 0n],
        [8, 900n, 0n],
      ])
    ).toBeNull()
  })

  it("ranks slices by realizable value and computes ratios over the fund NAV", () => {
    const holdings: BasketHoldingEntry[] = [
      [3, 1n, 1000n],
      [8, 1n, 3000n],
      [51, 1n, 4000n],
      [64, 1n, 2000n],
    ]

    const breakdown = getBasketHoldingsBreakdown(holdings)

    const slices = [
      { netuid: 51, ratio: 0.4 },
      { netuid: 8, ratio: 0.3 },
      { netuid: 64, ratio: 0.2 },
      { netuid: 3, ratio: 0.1 },
    ]
    expect(breakdown).toEqual({
      subnetCount: 4,
      topSlices: slices,
      allSlices: slices,
      othersRatio: expect.closeTo(0),
    })
  })

  it("excludes the netuid 0 TAO cash slot from the subnet count but keeps its ratio", () => {
    const holdings: BasketHoldingEntry[] = [
      [0, 5000n, 5000n],
      [3, 1n, 3000n],
      [8, 1n, 2000n],
    ]

    const breakdown = getBasketHoldingsBreakdown(holdings)

    expect(breakdown?.subnetCount).toBe(2)
    expect(breakdown?.topSlices).toEqual([
      { netuid: 0, ratio: 0.5 },
      { netuid: 3, ratio: 0.3 },
      { netuid: 8, ratio: 0.2 },
    ])
    expect(breakdown?.othersRatio).toBe(0)
  })

  it("ignores holdings with zero realizable value", () => {
    const breakdown = getBasketHoldingsBreakdown([
      [3, 1n, 100n],
      [8, 1n, 0n],
    ])

    expect(breakdown?.subnetCount).toBe(1)
    expect(breakdown?.topSlices).toEqual([{ netuid: 3, ratio: 1 }])
  })

  it("breaks value ties by ascending netuid", () => {
    const holdings: BasketHoldingEntry[] = [
      [51, 1n, 500n],
      [3, 1n, 500n],
      [8, 1n, 700n],
      [19, 1n, 500n],
    ]

    const breakdown = getBasketHoldingsBreakdown(holdings)

    expect(breakdown?.topSlices.map(({ netuid }) => netuid)).toEqual([8, 3, 19, 51])
  })

  it("counts every valued subnet even beyond the top slices", () => {
    const holdings: BasketHoldingEntry[] = Array.from(
      { length: 12 },
      (_, i): BasketHoldingEntry => [i + 1, 1n, 100n]
    )

    const breakdown = getBasketHoldingsBreakdown(holdings)

    expect(breakdown?.subnetCount).toBe(12)
    expect(breakdown?.topSlices).toHaveLength(8)
    expect(breakdown?.allSlices).toHaveLength(12)
    expect(breakdown?.othersRatio).toBeCloseTo(4 / 12)
  })

  it("keeps precision on plancks-sized values", () => {
    const breakdown = getBasketHoldingsBreakdown([
      [3, 1n, 750_000_000_000_000n],
      [8, 1n, 250_000_000_000_000n],
    ])

    expect(breakdown?.topSlices).toEqual([
      { netuid: 3, ratio: 0.75 },
      { netuid: 8, ratio: 0.25 },
    ])
  })
})
