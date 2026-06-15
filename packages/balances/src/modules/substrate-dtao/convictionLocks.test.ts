import { describe, expect, it } from "vitest"
import { findDTaoConvictionLock, getConvictionLockLabel, toBigIntValue } from "./convictionLocks"

describe("toBigIntValue", () => {
  it("returns bigints as-is", () => {
    expect(toBigIntValue(42n)).toBe(42n)
    expect(toBigIntValue(0n)).toBe(0n)
  })

  it("unwraps a non-unwrapped fixed-point newtype ({ bits })", () => {
    expect(toBigIntValue({ bits: 5n })).toBe(5n)
  })

  it("returns 0n for anything else", () => {
    expect(toBigIntValue(null)).toBe(0n)
    expect(toBigIntValue(undefined)).toBe(0n)
    expect(toBigIntValue("123")).toBe(0n)
    expect(toBigIntValue(42)).toBe(0n)
    expect(toBigIntValue({ bits: "5" })).toBe(0n)
    expect(toBigIntValue({ foo: 1n })).toBe(0n)
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
