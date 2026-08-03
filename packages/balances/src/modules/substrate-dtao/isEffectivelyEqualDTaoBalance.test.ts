import { describe, expect, test } from "vitest"

import type { AmountWithLabel, IBalance } from "../../types/balancetypes"
import { isEffectivelyEqualDTaoBalance } from "./isEffectivelyEqualDTaoBalance"

const makeDTaoBalance = ({
  stake = "1000000000000",
  status = "live",
  extraValues = [],
}: {
  stake?: string
  status?: string
  extraValues?: AmountWithLabel<string>[]
} = {}): IBalance => {
  return {
    address: "5Coldkey",
    networkId: "bittensor",
    tokenId: "bittensor-substrate-dtao-1-5Hotkey",
    source: "substrate-dtao",
    status,
    values: [{ type: "free", label: "Subnet Staking", amount: stake }, ...extraValues],
  } as IBalance
}

describe("isEffectivelyEqualDTaoBalance", () => {
  test("equal when nothing changed", () => {
    expect(isEffectivelyEqualDTaoBalance(makeDTaoBalance(), makeDTaoBalance())).toBe("equal")
  })

  test("small stake accrual (auto-compounding dividends) classifies as drift", () => {
    const previous = makeDTaoBalance({ stake: "1000000000000" })
    const next = makeDTaoBalance({ stake: "1000000000001" }) // 1 planck
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("drift")
  })

  test("large stake moves (real stake/unstake) emit immediately", () => {
    const previous = makeDTaoBalance({ stake: "1000000000000" })
    const next = makeDTaoBalance({ stake: "1100000000000" }) // +10%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("changed")
  })

  test("decaying conviction lock amounts classify as drift", () => {
    const withLock = (amount: string) =>
      makeDTaoBalance({
        extraValues: [
          {
            type: "locked",
            label: "Decaying lock",
            amount,
            meta: {
              convictionLock: { type: "conviction-lock", hotkey: "5Hotkey", lockType: "decaying" },
            },
          } as AmountWithLabel<string>,
        ],
      })
    expect(isEffectivelyEqualDTaoBalance(withLock("1000"), withLock("999"))).toBe("drift")
  })

  test("status changes are never tolerated", () => {
    const previous = makeDTaoBalance({ status: "cache" })
    const next = makeDTaoBalance({ status: "live" })
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("changed")
  })

  test("a conviction lock value appearing classifies as drift (toggle across zero)", () => {
    const previous = makeDTaoBalance()
    const next = makeDTaoBalance({
      extraValues: [
        {
          type: "locked",
          label: "Decaying lock",
          amount: "77",
          meta: {
            convictionLock: { type: "conviction-lock", hotkey: "5Hotkey", lockType: "decaying" },
          },
        } as AmountWithLabel<string>,
      ],
    })
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("drift")
  })

  test("a non-drift value appearing is a structural change", () => {
    const previous = makeDTaoBalance()
    const next = makeDTaoBalance({
      extraValues: [
        {
          type: "reserved",
          label: "reserved",
          amount: "77",
        } as AmountWithLabel<string>,
      ],
    })
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("changed")
  })

  test("conviction lock hotkey change is never tolerated", () => {
    const withLock = (hotkey: string) =>
      makeDTaoBalance({
        extraValues: [
          {
            type: "locked",
            label: "Decaying lock",
            amount: "77",
            meta: {
              convictionLock: { type: "conviction-lock", hotkey, lockType: "decaying" },
            },
          } as AmountWithLabel<string>,
        ],
      })
    expect(isEffectivelyEqualDTaoBalance(withLock("5HotkeyA"), withLock("5HotkeyB"))).not.toBe(
      "equal"
    )
    expect(isEffectivelyEqualDTaoBalance(withLock("5HotkeyA"), withLock("5HotkeyA"))).toBe("equal")
  })
})
