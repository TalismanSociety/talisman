import { describe, expect, test } from "vitest"

import type { AmountWithLabel, IBalance } from "../../types/balancetypes"
import type { SubDTaoBalanceMeta } from "./types"
import { isEffectivelyEqualDTaoBalance } from "./isEffectivelyEqualDTaoBalance"

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
    expect(isEffectivelyEqualDTaoBalance(makeDTaoBalance(), makeDTaoBalance())).toBe(true)
  })

  test("tolerates sub-0.1% alpha price drift", () => {
    const previous = makeDTaoBalance({ scaledAlphaPrice: "250000000" })
    const next = makeDTaoBalance({ scaledAlphaPrice: "250100000" }) // +0.04%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe(true)
  })

  test("rejects >0.1% alpha price move", () => {
    const previous = makeDTaoBalance({ scaledAlphaPrice: "250000000" })
    const next = makeDTaoBalance({ scaledAlphaPrice: "251000000" }) // +0.4%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe(false)
  })

  test("tolerates sub-0.1% pending root claim accrual", () => {
    const previous = makeDTaoBalance({ pendingRootClaim: "5000000000" })
    const next = makeDTaoBalance({ pendingRootClaim: "5001000000" }) // +0.02%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe(true)
  })

  test("rejects >0.1% pending root claim growth", () => {
    const previous = makeDTaoBalance({ pendingRootClaim: "5000000000" })
    const next = makeDTaoBalance({ pendingRootClaim: "5010000000" }) // +0.2%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe(false)
  })

  test("zero → non-zero pending claim is always a change", () => {
    const previous = makeDTaoBalance({ pendingRootClaim: "0" })
    const next = makeDTaoBalance({ pendingRootClaim: "1" })
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe(false)
  })

  test("stake changes are never tolerated", () => {
    const previous = makeDTaoBalance({ stake: "1000000000000" })
    const next = makeDTaoBalance({ stake: "1000000000001" }) // 1 planck
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe(false)
  })

  test("status changes are never tolerated", () => {
    const previous = makeDTaoBalance({ status: "cache" })
    const next = makeDTaoBalance({ status: "live" })
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe(false)
  })

  test("value count changes are never tolerated (e.g. new conviction lock)", () => {
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
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe(false)
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
    expect(isEffectivelyEqualDTaoBalance(withLock("5HotkeyA"), withLock("5HotkeyB"))).toBe(false)
    expect(isEffectivelyEqualDTaoBalance(withLock("5HotkeyA"), withLock("5HotkeyA"))).toBe(true)
  })
})
