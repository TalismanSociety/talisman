import { firstValueFrom, Subject, toArray } from "rxjs"
import { describe, expect, it } from "vitest"

import { mapWithYield } from "./chunkedArray"
import { concatMapChunked, switchMapChunked } from "./mapChunked"
import { yieldToEventLoop } from "./yieldToEventLoop"

describe("switchMapChunked", () => {
  it("emits the projected result", async () => {
    const source = new Subject<number>()
    const results: number[] = []
    const sub = source
      .pipe(switchMapChunked(async (value) => value * 2))
      .subscribe((v) => results.push(v))

    source.next(21)
    await yieldToEventLoop()

    expect(results).toEqual([42])
    sub.unsubscribe()
  })

  it("aborts in-flight work when the upstream emits again (latest-wins)", async () => {
    const source = new Subject<number>()
    const results: number[] = []
    const processed: number[] = []

    const sub = source
      .pipe(
        switchMapChunked(
          (value, { slicer }) =>
            mapWithYield(
              Array.from({ length: 100 }, (_, i) => i),
              (i) => {
                processed.push(value)
                return value * 1000 + i
              },
              { slicer }
            ),
          { budgetMs: 0 } // yield between every item so the abort is observed quickly
        )
      )
      .subscribe((v) => results.push(v[0]))

    source.next(1)
    // let value 1 make partial progress, then supersede it
    await yieldToEventLoop()
    source.next(2)
    // drain until value 2 completes
    while (results.length === 0) await yieldToEventLoop()
    sub.unsubscribe()

    expect(results).toEqual([2000])
    expect(processed.filter((v) => v === 1).length).toBeLessThan(100)
  })

  it("aborts in-flight work on unsubscribe and never emits late", async () => {
    const source = new Subject<number>()
    const results: number[] = []
    let processed = 0

    const sub = source
      .pipe(
        switchMapChunked(
          (_value, { slicer }) =>
            mapWithYield(
              Array.from({ length: 100 }, (_, i) => i),
              () => processed++,
              { slicer }
            ),
          { budgetMs: 0 }
        )
      )
      .subscribe((v) => results.push(v.length))

    source.next(1)
    await yieldToEventLoop()
    sub.unsubscribe()

    const processedAtUnsubscribe = processed
    for (let i = 0; i < 5; i++) await yieldToEventLoop()

    expect(results).toEqual([])
    expect(processed).toBe(processedAtUnsubscribe)
  })

  it("errors the stream on non-abort errors", async () => {
    const source = new Subject<number>()
    let error: unknown

    const sub = source
      .pipe(
        switchMapChunked(async () => {
          throw new Error("boom")
        })
      )
      .subscribe({ error: (e) => (error = e) })

    source.next(1)
    while (!error) await yieldToEventLoop()

    expect(error).toEqual(new Error("boom"))
    sub.unsubscribe()
  })
})

describe("concatMapChunked", () => {
  it("processes all values in order without cancelling on re-emission", async () => {
    const source = new Subject<number>()
    const resultsPromise = firstValueFrom(
      source.pipe(
        concatMapChunked(async (value) => value * 2),
        toArray()
      )
    )

    source.next(1)
    source.next(2)
    source.next(3)
    source.complete()

    expect(await resultsPromise).toEqual([2, 4, 6])
  })
})
