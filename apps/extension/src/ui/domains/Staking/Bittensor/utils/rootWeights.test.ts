import { describe, expect, it } from "vitest"

import { getRootWeightsBreakdown, type RootWeightEntry } from "./rootWeights"

describe("getRootWeightsBreakdown", () => {
  it("returns null when no weights are set", () => {
    expect(getRootWeightsBreakdown([])).toBeNull()
  })

  it("returns null when all weights are zero", () => {
    expect(
      getRootWeightsBreakdown([
        [3, 0],
        [8, 0],
      ])
    ).toBeNull()
  })

  it("ranks slices by weight and computes ratios over the vector sum", () => {
    const weights: RootWeightEntry[] = [
      [3, 1000],
      [8, 3000],
      [51, 4000],
      [64, 2000],
    ]

    const breakdown = getRootWeightsBreakdown(weights)

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

  it("excludes the netuid 0 TAO cash slice from the subnet count but keeps its ratio", () => {
    const weights: RootWeightEntry[] = [
      [0, 5000],
      [3, 3000],
      [8, 2000],
    ]

    const breakdown = getRootWeightsBreakdown(weights)

    expect(breakdown?.subnetCount).toBe(2)
    expect(breakdown?.topSlices).toEqual([
      { netuid: 0, ratio: 0.5 },
      { netuid: 3, ratio: 0.3 },
      { netuid: 8, ratio: 0.2 },
    ])
    expect(breakdown?.othersRatio).toBe(0)
  })

  it("ignores zero-weight entries", () => {
    const breakdown = getRootWeightsBreakdown([
      [3, 100],
      [8, 0],
    ])

    expect(breakdown?.subnetCount).toBe(1)
    expect(breakdown?.topSlices).toEqual([{ netuid: 3, ratio: 1 }])
  })

  it("breaks weight ties by ascending netuid", () => {
    const weights: RootWeightEntry[] = [
      [51, 500],
      [3, 500],
      [8, 700],
      [19, 500],
    ]

    const breakdown = getRootWeightsBreakdown(weights)

    expect(breakdown?.topSlices.map(({ netuid }) => netuid)).toEqual([8, 3, 19, 51])
  })

  it("counts every weighted subnet even beyond the top slices", () => {
    const weights: RootWeightEntry[] = Array.from(
      { length: 12 },
      (_, i): RootWeightEntry => [i + 1, 100]
    )

    const breakdown = getRootWeightsBreakdown(weights)

    expect(breakdown?.subnetCount).toBe(12)
    expect(breakdown?.topSlices).toHaveLength(8)
    expect(breakdown?.allSlices).toHaveLength(12)
    expect(breakdown?.othersRatio).toBeCloseTo(4 / 12)
  })
})
