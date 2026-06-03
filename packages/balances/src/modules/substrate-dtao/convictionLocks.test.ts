import { describe, expect, it } from "vitest"
import {
  getConvictionLockCandidates,
  getConvictionLockLabel,
  getConvictionLockPairs,
  toBigIntValue,
  u64f64RawToPlanck,
} from "./convictionLocks"
import type { GetStakeInfosResult } from "./types"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const ADDRESS_2 = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"
const HOTKEY = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const HOTKEY_2 = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"

const makeStakeInfos = (
  entries: Array<[address: string, stakes: Array<{ netuid: number; hotkey: string }>]>
) => entries as unknown as GetStakeInfosResult

describe("toBigIntValue", () => {
  it("returns bigints as-is", () => {
    expect(toBigIntValue(42n)).toBe(42n)
    expect(toBigIntValue(0n)).toBe(0n)
  })

  it("truncates numbers", () => {
    expect(toBigIntValue(42)).toBe(42n)
    expect(toBigIntValue(42.9)).toBe(42n)
    expect(toBigIntValue(-7.5)).toBe(-7n)
  })

  it("returns 0n for non-finite numbers", () => {
    expect(toBigIntValue(Number.NaN)).toBe(0n)
    expect(toBigIntValue(Number.POSITIVE_INFINITY)).toBe(0n)
  })

  it("parses numeric strings", () => {
    expect(toBigIntValue("123")).toBe(123n)
    expect(toBigIntValue("12.5")).toBe(12n) // falls back to Number parsing + truncation
  })

  it("returns 0n for empty or non-numeric strings", () => {
    expect(toBigIntValue("")).toBe(0n)
    expect(toBigIntValue("abc")).toBe(0n)
  })

  it("uses the first element of arrays", () => {
    expect(toBigIntValue([7n, 8n])).toBe(7n)
    expect(toBigIntValue([])).toBe(0n)
  })

  it("unwraps known object keys, bits first", () => {
    expect(toBigIntValue({ bits: 5n })).toBe(5n)
    expect(toBigIntValue({ value: "9" })).toBe(9n)
    expect(toBigIntValue({ inner: 3 })).toBe(3n)
    expect(toBigIntValue({ "0": 11n })).toBe(11n)
    expect(toBigIntValue({ bits: 1n, value: 2n })).toBe(1n)
    expect(toBigIntValue({ bits: { value: 2n } })).toBe(2n)
  })

  it("returns 0n for null, undefined and unknown shapes", () => {
    expect(toBigIntValue(null)).toBe(0n)
    expect(toBigIntValue(undefined)).toBe(0n)
    expect(toBigIntValue({ foo: 1n })).toBe(0n)
  })
})

describe("u64f64RawToPlanck", () => {
  it("returns the integer part of a U64F64 raw value", () => {
    expect(u64f64RawToPlanck(0n)).toBe(0n)
    expect(u64f64RawToPlanck(42n << 64n)).toBe(42n)
    // 42.5 in U64F64 is 85 * 2^63
    expect(u64f64RawToPlanck(85n << 63n)).toBe(42n)
    // pure fraction (0.5) truncates to 0
    expect(u64f64RawToPlanck(1n << 63n)).toBe(0n)
  })

  it("unwraps a { bits } encoded fixed-point value", () => {
    expect(u64f64RawToPlanck({ bits: 42n << 64n })).toBe(42n)
  })
})

describe("getConvictionLockCandidates", () => {
  it("returns an empty array for empty stakeInfos", () => {
    expect(getConvictionLockCandidates(makeStakeInfos([]))).toEqual([])
    expect(getConvictionLockCandidates(makeStakeInfos([[ADDRESS, []]]))).toEqual([])
  })

  it("collects one candidate per (address, netuid, hotkey)", () => {
    const stakeInfos = makeStakeInfos([
      [
        ADDRESS,
        [
          { netuid: 1, hotkey: HOTKEY },
          { netuid: 2, hotkey: HOTKEY },
          { netuid: 1, hotkey: HOTKEY_2 },
        ],
      ],
      [ADDRESS_2, [{ netuid: 1, hotkey: HOTKEY }]],
    ])

    expect(getConvictionLockCandidates(stakeInfos)).toEqual([
      { address: ADDRESS, netuid: 1, hotkey: HOTKEY },
      { address: ADDRESS, netuid: 2, hotkey: HOTKEY },
      { address: ADDRESS, netuid: 1, hotkey: HOTKEY_2 },
      { address: ADDRESS_2, netuid: 1, hotkey: HOTKEY },
    ])
  })

  it("dedups identical (address, netuid, hotkey) triples", () => {
    const stakeInfos = makeStakeInfos([
      [
        ADDRESS,
        [
          { netuid: 1, hotkey: HOTKEY },
          { netuid: 1, hotkey: HOTKEY },
        ],
      ],
    ])

    expect(getConvictionLockCandidates(stakeInfos)).toEqual([
      { address: ADDRESS, netuid: 1, hotkey: HOTKEY },
    ])
  })
})

describe("getConvictionLockPairs", () => {
  it("dedups candidates of the same (address, netuid) across hotkeys", () => {
    const pairs = getConvictionLockPairs([
      { address: ADDRESS, netuid: 1, hotkey: HOTKEY },
      { address: ADDRESS, netuid: 1, hotkey: HOTKEY_2 },
    ])

    expect(pairs).toEqual([{ address: ADDRESS, netuid: 1 }])
  })

  it("keeps distinct addresses and netuids separate", () => {
    const pairs = getConvictionLockPairs([
      { address: ADDRESS, netuid: 1, hotkey: HOTKEY },
      { address: ADDRESS, netuid: 2, hotkey: HOTKEY },
      { address: ADDRESS_2, netuid: 1, hotkey: HOTKEY },
    ])

    expect(pairs).toEqual([
      { address: ADDRESS, netuid: 1 },
      { address: ADDRESS, netuid: 2 },
      { address: ADDRESS_2, netuid: 1 },
    ])
  })

  it("returns an empty array for no candidates", () => {
    expect(getConvictionLockPairs([])).toEqual([])
  })
})

describe("getConvictionLockLabel", () => {
  it("labels perpetual locks", () => {
    expect(getConvictionLockLabel("perpetual")).toBe("Perpetual Conviction Lock")
  })

  it("labels decaying locks", () => {
    expect(getConvictionLockLabel("decaying")).toBe("Decaying Conviction Lock")
  })
})
