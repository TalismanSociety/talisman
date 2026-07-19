import { isEqual } from "lodash-es"
import { describe, expect, it } from "vitest"

import {
  arrayItemsEqualWithYield,
  forEachWithYield,
  keyByWithYield,
  mapWithYield,
} from "./chunkedArray"
import { createTimeSlicer } from "./timeSlicer"

const busyWaitMs = (ms: number) => {
  const start = performance.now()
  while (performance.now() - start < ms) {
    // burn CPU
  }
}

describe("mapWithYield", () => {
  it("returns the same result as Array.prototype.map", async () => {
    const items = Array.from({ length: 1000 }, (_, i) => i)
    const fn = (item: number, index: number) => item * 2 + index

    expect(await mapWithYield(items, fn)).toEqual(items.map(fn))
  })

  it("handles empty arrays", async () => {
    expect(await mapWithYield([], (item) => item)).toEqual([])
  })

  it("propagates errors thrown by fn", async () => {
    await expect(
      mapWithYield([1, 2, 3], (item) => {
        if (item === 2) throw new Error("boom")
        return item
      })
    ).rejects.toThrow("boom")
  })

  it("yields the thread to the event loop while processing", async () => {
    const items = Array.from({ length: 100 }, (_, i) => i)

    let timerTicks = 0
    const interval = setInterval(() => timerTicks++, 1)
    try {
      await mapWithYield(items, () => busyWaitMs(0.5), { budgetMs: 2 })
    } finally {
      clearInterval(interval)
    }

    // 100 items * 0.5ms = ~50ms of work in ~2ms slices: timers must have fired in between
    expect(timerTicks).toBeGreaterThan(0)
  })

  it("stops within one slice when aborted mid-run", async () => {
    const controller = new AbortController()
    let processed = 0

    const promise = mapWithYield(
      Array.from({ length: 1000 }, (_, i) => i),
      () => {
        processed++
        busyWaitMs(0.5)
      },
      { budgetMs: 2, signal: controller.signal }
    )
    controller.abort()

    await expect(promise).rejects.toSatisfy(
      (error) => error instanceof Error && error.name === "AbortError"
    )
    expect(processed).toBeLessThan(1000)
  })

  it("shares the budget across phases when given a shared slicer", async () => {
    let time = 0
    let yields = 0
    const slicer = createTimeSlicer({ budgetMs: 10, now: () => time })
    const originalYieldIfNeeded = slicer.yieldIfNeeded
    slicer.yieldIfNeeded = () => {
      const yielded = originalYieldIfNeeded()
      if (yielded) yields++
      return yielded
    }

    // two phases of 6 "ms" each: with a shared slicer the budget spans both,
    // so the second phase must yield even though it is within budget on its own
    await forEachWithYield([1, 2, 3], () => (time += 2), { slicer })
    expect(yields).toBe(0)
    await forEachWithYield([1, 2, 3], () => (time += 2), { slicer })
    expect(yields).toBeGreaterThan(0)
  })
})

describe("keyByWithYield", () => {
  it("keys items like lodash keyBy (last item wins on duplicate keys)", async () => {
    const items = [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "a", value: 3 },
    ]

    expect(await keyByWithYield(items, (item) => item.id)).toEqual({
      a: { id: "a", value: 3 },
      b: { id: "b", value: 2 },
    })
  })
})

describe("arrayItemsEqualWithYield", () => {
  const cases: Array<[unknown[] | undefined, unknown[] | undefined]> = [
    [[], []],
    [
      [1, 2, 3],
      [1, 2, 3],
    ],
    [
      [1, 2, 3],
      [1, 2, 4],
    ],
    [
      [1, 2, 3],
      [1, 2],
    ],
    [
      [1, 2, 3],
      [3, 2, 1],
    ],
    [[{ a: { b: 1 } }], [{ a: { b: 1 } }]],
    [[{ a: { b: 1 } }], [{ a: { b: 2 } }]],
    [undefined, []],
    [undefined, undefined],
  ]

  it.each(cases)("agrees with lodash isEqual (%j vs %j)", async (a, b) => {
    expect(await arrayItemsEqualWithYield(a, b)).toBe(isEqual(a, b))
  })

  it("fast-paths reference-equal arrays", async () => {
    const items = [{ a: 1 }]
    expect(await arrayItemsEqualWithYield(items, items)).toBe(true)
  })

  it("supports a custom item comparator", async () => {
    const a = [{ id: 1, noise: "x" }]
    const b = [{ id: 1, noise: "y" }]
    expect(await arrayItemsEqualWithYield(a, b, { isItemEqual: (x, y) => x.id === y.id })).toBe(
      true
    )
  })
})
