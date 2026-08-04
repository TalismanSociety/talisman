import { describe, expect, test } from "vitest"

import type { AmountWithLabel, IBalance } from "../../types/balancetypes"
import { isEffectivelyEqualDTaoBalance } from "./isEffectivelyEqualDTaoBalance"

const makeDTaoBalance = ({
  stake = "1000000000000",
  claimable,
  holdUnlockBlock,
  status = "live",
  extraValues = [],
}: {
  stake?: string
  claimable?: string
  holdUnlockBlock?: number
  status?: string
  extraValues?: AmountWithLabel<string>[]
} = {}): IBalance => {
  return {
    address: "5Coldkey",
    networkId: "bittensor",
    tokenId: "bittensor-substrate-dtao-1-5Hotkey",
    source: "substrate-dtao",
    status,
    values: [
      {
        type: "free",
        label: "Subnet Staking",
        amount: stake,
        ...(holdUnlockBlock !== undefined && {
          meta: { rootStakeHold: { type: "root-stake-hold", unlockAtBlock: holdUnlockBlock } },
        }),
      },
      ...(claimable !== undefined
        ? ([
            {
              type: "locked",
              label: "Claimable rewards",
              amount: claimable,
              includeInTransferable: true,
            },
            { type: "extra", label: "Claimable rewards", amount: claimable, includeInTotal: true },
          ] as AmountWithLabel<string>[])
        : []),
      ...extraValues,
    ],
  } as IBalance
}

describe("isEffectivelyEqualDTaoBalance", () => {
  test("equal when nothing changed", () => {
    expect(isEffectivelyEqualDTaoBalance(makeDTaoBalance(), makeDTaoBalance())).toBe("equal")
  })

  test("tolerates sub-1% claimable rewards movement", () => {
    const previous = makeDTaoBalance({ claimable: "5000000000" })
    const next = makeDTaoBalance({ claimable: "5010000000" }) // +0.2%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("equal")
  })

  test(">1% claimable rewards movement classifies as drift", () => {
    const previous = makeDTaoBalance({ claimable: "5000000000" })
    const next = makeDTaoBalance({ claimable: "5100000000" }) // +2%
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("drift")
  })

  test("a claimable rewards value appearing classifies as drift (toggle across zero)", () => {
    const previous = makeDTaoBalance()
    const next = makeDTaoBalance({ claimable: "1" })
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("drift")
  })

  test("a claimable rewards value disappearing (claimed or exited) is never tolerated", () => {
    const previous = makeDTaoBalance({ claimable: "5000000000" })
    const next = makeDTaoBalance()
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("changed")
  })

  test("a claim landing as a sub-tolerance stake bump still emits immediately", () => {
    // claim payout stakes back onto the root position: the claimable values vanish and the
    // stake grows — even a <1% payout must not linger as drift or the UI keeps offering
    // the already-executed claim
    const previous = makeDTaoBalance({ stake: "1000000000000", claimable: "5000000000" })
    const next = makeDTaoBalance({ stake: "1005000000000" })
    expect(isEffectivelyEqualDTaoBalance(previous, next)).toBe("changed")
  })

  test("a conviction lock value disappearing (decayed away) classifies as drift", () => {
    const previous = makeDTaoBalance({
      extraValues: [
        {
          type: "locked",
          label: "Decaying lock",
          amount: "1",
          meta: {
            convictionLock: { type: "conviction-lock", hotkey: "5Hotkey", lockType: "decaying" },
          },
        } as AmountWithLabel<string>,
      ],
    })
    expect(isEffectivelyEqualDTaoBalance(previous, makeDTaoBalance())).toBe("drift")
  })

  test("a root stake hold appearing, changing or expiring is never tolerated", () => {
    const without = makeDTaoBalance()
    const at1050 = makeDTaoBalance({ holdUnlockBlock: 1050 })
    const at1060 = makeDTaoBalance({ holdUnlockBlock: 1060 })
    expect(isEffectivelyEqualDTaoBalance(without, at1050)).toBe("changed")
    expect(isEffectivelyEqualDTaoBalance(at1050, at1060)).toBe("changed")
    expect(isEffectivelyEqualDTaoBalance(at1050, without)).toBe("changed")
    expect(isEffectivelyEqualDTaoBalance(at1050, makeDTaoBalance({ holdUnlockBlock: 1050 }))).toBe(
      "equal"
    )
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
