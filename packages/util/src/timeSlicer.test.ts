import { describe, expect, it } from "vitest"

import { isAbortError } from "./isAbortError"
import { createTimeSlicer, DEFAULT_TIME_SLICE_BUDGET_MS, newAbortError } from "./timeSlicer"

describe("newAbortError", () => {
  it("is recognized by isAbortError", () => {
    expect(isAbortError(newAbortError())).toBe(true)
  })
})

describe("createTimeSlicer", () => {
  it("does not want to yield before the budget is consumed", () => {
    let time = 0
    const slicer = createTimeSlicer({ budgetMs: 10, now: () => time })

    expect(slicer.shouldYield()).toBe(false)
    expect(slicer.yieldIfNeeded()).toBeUndefined()

    time = 9
    expect(slicer.shouldYield()).toBe(false)
    expect(slicer.yieldIfNeeded()).toBeUndefined()
  })

  it("wants to yield once the budget is consumed", () => {
    let time = 0
    const slicer = createTimeSlicer({ budgetMs: 10, now: () => time })

    time = 10
    expect(slicer.shouldYield()).toBe(true)
    expect(slicer.yieldIfNeeded()).toBeInstanceOf(Promise)
  })

  it("resets the slice after a yield", async () => {
    let time = 0
    const slicer = createTimeSlicer({ budgetMs: 10, now: () => time })

    time = 15
    await slicer.yield()
    expect(slicer.shouldYield()).toBe(false)

    time = 25
    expect(slicer.shouldYield()).toBe(true)
  })

  it("uses the default budget when none is given", () => {
    let time = 0
    const slicer = createTimeSlicer({ now: () => time })

    time = DEFAULT_TIME_SLICE_BUDGET_MS - 1
    expect(slicer.shouldYield()).toBe(false)
    time = DEFAULT_TIME_SLICE_BUDGET_MS
    expect(slicer.shouldYield()).toBe(true)
  })

  it("throws an AbortError from its check points once the signal is aborted", async () => {
    const controller = new AbortController()
    const slicer = createTimeSlicer({ budgetMs: 10, signal: controller.signal })

    expect(() => slicer.throwIfAborted()).not.toThrow()
    expect(slicer.yieldIfNeeded()).toBeUndefined()

    controller.abort()

    expect(() => slicer.throwIfAborted()).toThrowError(
      expect.objectContaining({ name: "AbortError" })
    )
    expect(() => slicer.yieldIfNeeded()).toThrowError(
      expect.objectContaining({ name: "AbortError" })
    )
    await expect(slicer.yield()).rejects.toSatisfy(isAbortError)
  })
})
