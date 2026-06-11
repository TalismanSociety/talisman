import { describe, expect, it } from "vitest"
import {
  findDTaoConvictionLock,
  getConvictionLockLabel,
  toBigIntValue,
  u64f64RawToPlanck,
} from "./convictionLocks"

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

describe("getConvictionLockLabel", () => {
  it("labels perpetual locks", () => {
    expect(getConvictionLockLabel("perpetual")).toBe("Perpetual Conviction Lock")
  })

  it("labels decaying locks", () => {
    expect(getConvictionLockLabel("decaying")).toBe("Decaying Conviction Lock")
  })
})

describe("findDTaoConvictionLock", () => {
  const lockHotkey = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
  const convictionLockMeta = {
    scaledAlphaPrice: "0",
    convictionLock: {
      type: "conviction-lock",
      hotkey: lockHotkey,
      lockType: "decaying",
      conviction: "0",
      convictionRaw: "0",
      convictionFormat: "U64F64",
      lastUpdate: "0",
    },
  }

  it("returns null when there is no lock", () => {
    expect(findDTaoConvictionLock(undefined)).toBeNull()
    expect(findDTaoConvictionLock(null)).toBeNull()
    expect(findDTaoConvictionLock([])).toBeNull()
    expect(
      findDTaoConvictionLock([
        { amount: { planck: 10n }, meta: { scaledAlphaPrice: "0" } }, // eg pending root claim
      ])
    ).toBeNull()
  })

  it("finds the conviction lock among other locks", () => {
    expect(
      findDTaoConvictionLock([
        { amount: { planck: 10n }, meta: { scaledAlphaPrice: "0" } },
        { amount: { planck: 42n }, meta: convictionLockMeta },
      ])
    ).toEqual({
      amount: 42n,
      hotkey: lockHotkey,
      lockType: "decaying",
      label: "Decaying Conviction Lock",
    })
  })

  it("returns the lock type and label for perpetual locks", () => {
    expect(
      findDTaoConvictionLock([
        {
          amount: { planck: 7n },
          meta: {
            ...convictionLockMeta,
            convictionLock: { ...convictionLockMeta.convictionLock, lockType: "perpetual" },
          },
        },
      ])
    ).toEqual({
      amount: 7n,
      hotkey: lockHotkey,
      lockType: "perpetual",
      label: "Perpetual Conviction Lock",
    })
  })
})
