import { BehaviorSubject, Observable } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getSharedObservable } from "./getSharedObservable"

describe("getSharedObservable", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the same observable for identical namespace + args", () => {
    const create = vi.fn(() => new BehaviorSubject(1).asObservable())
    const a = getSharedObservable("test-same", { x: 1 }, create)
    const b = getSharedObservable("test-same", { x: 1 }, create)

    expect(a).toBe(b)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it("shares a single source subscription between concurrent subscribers", () => {
    let sourceSubscriptions = 0
    const obs = getSharedObservable(
      "test-share",
      { x: 2 },
      () =>
        new Observable<number>((subscriber) => {
          sourceSubscriptions++
          subscriber.next(42)
        })
    )

    const values: number[] = []
    const sub1 = obs.subscribe((v) => values.push(v))
    const sub2 = obs.subscribe((v) => values.push(v)) // replayed, not re-subscribed

    expect(values).toEqual([42, 42])
    expect(sourceSubscriptions).toBe(1)
    sub1.unsubscribe()
    sub2.unsubscribe()
  })

  it("keeps the entry while subscribed, drops it after the cleanup delay", () => {
    const create = vi.fn(() => new BehaviorSubject(1).asObservable())
    const obs = getSharedObservable("test-cleanup", { x: 3 }, create)

    const sub = obs.subscribe()
    // long past the cleanup delay: entry must survive while subscribed
    vi.advanceTimersByTime(10 * 60_000)
    expect(getSharedObservable("test-cleanup", { x: 3 }, create)).toBe(obs)
    expect(create).toHaveBeenCalledTimes(1)

    sub.unsubscribe()
    // within the grace window: still reused
    vi.advanceTimersByTime(30_000)
    expect(getSharedObservable("test-cleanup", { x: 3 }, create)).toBe(obs)

    // a resubscription within the window cancels the pending cleanup
    const sub2 = obs.subscribe()
    vi.advanceTimersByTime(10 * 60_000)
    expect(getSharedObservable("test-cleanup", { x: 3 }, create)).toBe(obs)
    sub2.unsubscribe()

    // past the grace window with no subscribers: entry dropped, factory re-runs
    vi.advanceTimersByTime(61_000)
    const fresh = getSharedObservable("test-cleanup", { x: 3 }, create)
    expect(fresh).not.toBe(obs)
    expect(create).toHaveBeenCalledTimes(2)
  })

  it("drops entries that were created but never subscribed to", () => {
    const create = vi.fn(() => new BehaviorSubject(1).asObservable())
    const obs = getSharedObservable("test-untouched", { x: 4 }, create)

    vi.advanceTimersByTime(61_000)
    const fresh = getSharedObservable("test-untouched", { x: 4 }, create)
    expect(fresh).not.toBe(obs)
    expect(create).toHaveBeenCalledTimes(2)
  })
})
