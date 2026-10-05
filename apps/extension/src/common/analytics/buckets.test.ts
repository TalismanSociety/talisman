import { describe, expect, it } from "vitest"

import { toAmountBucket, toDayBucket, toShareBucket } from "./buckets"

const DAY = 24 * 60 * 60_000

describe("toAmountBucket", () => {
  it.each([
    [undefined, "0"],
    [null, "0"],
    [Number.NaN, "0"],
    [-5, "0"],
    [0, "0"],
    [0.01, "<10"],
    [9.99, "<10"],
    [10, "10-100"],
    [999, "100-1k"],
    [1_000, "1k-10k"],
    [99_999, "10k-100k"],
    [100_000, "100k-1M"],
    [9_999_999, "1M-10M"],
    [10_000_000, "10M-100M"],
    [100_000_000, ">100M"],
    [Number.POSITIVE_INFINITY, "0"],
  ])("%s -> %s", (fiat, bucket) => {
    expect(toAmountBucket(fiat)).toBe(bucket)
  })
})

describe("toShareBucket", () => {
  it.each([
    [0, 100, "0"],
    [5, 0, "0"],
    [5, -1, "0"],
    [9.99, 100, "<10%"],
    [10, 100, "10-25%"],
    [25, 100, "25-50%"],
    [50, 100, "50-75%"],
    [75, 100, "75-100%"],
    [100, 100, "75-100%"],
  ])("%s of %s -> %s", (part, whole, bucket) => {
    expect(toShareBucket(part, whole)).toBe(bucket)
  })
})

describe("toDayBucket", () => {
  const now = 1_000 * DAY

  it.each([
    [null, "unknown"],
    [now + DAY, "unknown"],
    [now - DAY / 2, "0"],
    [now - DAY, "1-6"],
    [now - 7 * DAY, "7-29"],
    [now - 30 * DAY, "30-89"],
    [now - 90 * DAY, "90-364"],
    [now - 365 * DAY, "365+"],
  ])("installed at %s -> %s", (since, bucket) => {
    expect(toDayBucket(since, now)).toBe(bucket)
  })
})
