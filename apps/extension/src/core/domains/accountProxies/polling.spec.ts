import { take } from "rxjs"
import { TestScheduler } from "rxjs/testing"
import { describe, expect, it } from "vitest"

import { createPollingTrigger$ } from "./polling"

describe("createPollingTrigger$", () => {
  it("waits for the first value before starting immediate and interval polling", () => {
    const scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected))

    scheduler.run(({ cold }) => {
      const frames: number[] = []

      createPollingTrigger$(cold("----a", { a: ["candidate"] }), 10)
        .pipe(take(3))
        .subscribe(() => frames.push(scheduler.now()))

      scheduler.flush()

      expect(frames).toEqual([4, 14, 24])
    })
  })

  it("immediately restarts polling when the source value changes", () => {
    const scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected))

    scheduler.run(({ cold }) => {
      const emissions: Array<{ frame: number; value: string }> = []

      createPollingTrigger$(cold("----a----------b", { a: "first", b: "second" }), 10)
        .pipe(take(4))
        .subscribe((value) => emissions.push({ frame: scheduler.now(), value }))

      scheduler.flush()

      expect(emissions).toEqual([
        { frame: 4, value: "first" },
        { frame: 14, value: "first" },
        { frame: 15, value: "second" },
        { frame: 25, value: "second" },
      ])
    })
  })
})
