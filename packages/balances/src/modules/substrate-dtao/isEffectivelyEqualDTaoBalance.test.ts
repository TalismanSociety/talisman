import { describe, expect, test } from "vitest"

import type { AmountWithLabel, IBalance } from "../../types/balancetypes"
import { isEffectivelyEqualDTaoBalance } from "./isEffectivelyEqualDTaoBalance"
import type { SubDTaoBalanceMeta } from "./types"

const makeDTaoBalance = ({
  stake = "1000000000000",
  pendingRootClaim = "5000000000",
  scaledAlphaPrice = "250000000",
  status = "live",
  extraValues = [],
}: {
  stake?: string
  pendingRootClaim?: string
  scaledAlphaPrice?: string
  status?: string
  extraValues?: AmountWithLabel<string>[]
} = {}): IBalance => {
  const meta: SubDTaoBalanceMeta = { scaledAlphaPrice }
  return {
    address: "5Coldkey",
    networkId: "bittensor",
    tokenId: "bittensor-substrate-dtao-1-5Hotkey",
    source: "substrate-dtao",
    status,
    values: [
      { type: "free", label: "Subnet Staking", amount: stake, meta },
      {
        type: "locked",
        label: "Pending root claim",
        amount: pendingRootClaim,
        includeInTransferable: true,
        meta,
      },
      ...extraValues,
    ],
  } as IBalance
}

describe("isEffectivelyEqualDTaoBalance", () => {
  test("equal when nothing changed", () => {
    expect(isEffectivelyEqualDTaoBalance(makeDTaoBalance(), makeDTaoBalance())).toBe("equal")
  })

  test("tolerates sub-0.5% alpha price drift", () => {
    const previous = makeDTaoBalance({ scaledAlphaPrice: "250000000" })
    const next = makeDTaoBalance({ scaledAlphaPrice: "251000000" }) // +0.4%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("equal")
  })

  test(">0.5% alpha price move classifies as drift", () => {
    const previous = makeDTaoBalance({ scaledAlphaPrice: "250000000" })
    const next = makeDTaoBalance({ scaledAlphaPrice: "252500000" }) // +1%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("drift")
  })

  test("tolerates sub-1% pending root claim accrual", () => {
    const previous = makeDTaoBalance({ pendingRootClaim: "5000000000" })
    const next = makeDTaoBalance({ pendingRootClaim: "5010000000" }) // +0.2%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("equal")
  })

  test(">1% pending root claim growth classifies as drift", () => {
    const previous = makeDTaoBalance({ pendingRootClaim: "5000000000" })
    const next = makeDTaoBalance({ pendingRootClaim: "5100000000" }) // +2%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("drift")
  })

  test("zero → non-zero pending claim is always a change", () => {
    const previous = makeDTaoBalance({ pendingRootClaim: "0" })
    const next = makeDTaoBalance({ pendingRootClaim: "1" })
    expect(isEffectivelyEqualDTaoBalance(previous, next)).not.toBe("equal")
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
              scaledAlphaPrice: "250000000",
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
            scaledAlphaPrice: "250000000",
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
          meta: { scaledAlphaPrice: "250000000" },
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
              scaledAlphaPrice: "250000000",
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
