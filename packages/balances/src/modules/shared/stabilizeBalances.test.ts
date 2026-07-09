import { describe, expect, test } from "vitest"

import type { IBalance } from "../../types"
import { classifySmallAmountDrift, createBalanceStabilizer } from "./stabilizeBalances"

const makeBalance = (overrides: Partial<IBalance> & { address: string; tokenId: string }) =>
  ({
    networkId: "polkadot",
    source: "substrate-native",
    status: "live",
    values: [{ type: "free", label: "free", amount: "100" }],
    ...overrides,
  }) as IBalance

describe("createBalanceStabilizer", () => {
  test("reuses previous object when fingerprint-identical", () => {
    const stabilize = createBalanceStabilizer()

    const first = makeBalance({ address: "a", tokenId: "polkadot-substrate-native" })
    const [emitted1] = stabilize([first])
    expect(emitted1).toBe(first)

    // brand-new object, identical content (what every poll produces)
    const second = makeBalance({ address: "a", tokenId: "polkadot-substrate-native" })
    expect(second).not.toBe(first)
    const [emitted2] = stabilize([second])
    expect(emitted2).toBe(first)
  })

  test("emits new object when content changed", () => {
    const stabilize = createBalanceStabilizer()

    const first = makeBalance({ address: "a", tokenId: "polkadot-substrate-native" })
    stabilize([first])

    const changed = makeBalance({
      address: "a",
      tokenId: "polkadot-substrate-native",
      values: [{ type: "free", label: "free", amount: "200" }],
    })
    const [emitted] = stabilize([changed])
    expect(emitted).toBe(changed)
  })

  test("status transitions are never swallowed", () => {
    const stabilize = createBalanceStabilizer()

    const cached = makeBalance({ address: "a", tokenId: "t", status: "cache" })
    stabilize([cached])

    const live = makeBalance({ address: "a", tokenId: "t", status: "live" })
    const [emitted] = stabilize([live])
    expect(emitted).toBe(live)
  })

  test("forgets balances absent from the latest emission", () => {
    const stabilize = createBalanceStabilizer()

    const a = makeBalance({ address: "a", tokenId: "t" })
    stabilize([a])
    stabilize([]) // a removed

    const aAgain = makeBalance({ address: "a", tokenId: "t" })
    const [emitted] = stabilize([aAgain])
    // no previous to reuse — the fresh object is emitted
    expect(emitted).toBe(aAgain)
  })

  test("drift-classified changes re-emit at most once per driftRefreshMs", () => {
    let clock = 0
    const stabilize = createBalanceStabilizer(
      (previous, next) => {
        const [prevValue] = ("values" in previous ? (previous.values ?? []) : []) as {
          amount: string
        }[]
        const [nextValue] = ("values" in next ? (next.values ?? []) : []) as { amount: string }[]
        return prevValue?.amount === nextValue?.amount ? "equal" : "drift"
      },
      { driftRefreshMs: 30_000, now: () => clock }
    )

    const at = (amount: string) =>
      makeBalance({
        address: "a",
        tokenId: "t",
        values: [{ type: "free", label: "free", amount }],
      })

    const first = at("100")
    expect(stabilize([first])[0]).toBe(first)

    // drift within the refresh window → previous object reused
    clock = 10_000
    expect(stabilize([at("101")])[0]).toBe(first)
    clock = 20_000
    expect(stabilize([at("102")])[0]).toBe(first)

    // window elapsed → the fresh object is emitted and becomes the new baseline
    clock = 31_000
    const refreshed = at("103")
    expect(stabilize([refreshed])[0]).toBe(refreshed)

    // new window starts from the refresh
    clock = 40_000
    expect(stabilize([at("104")])[0]).toBe(refreshed)
  })

  test("custom equivalence short-circuits reuse, exact fingerprint still wins otherwise", () => {
    // comparator that tolerates any difference in the value's amount
    const stabilize = createBalanceStabilizer(
      (previous, next) =>
        previous.address === next.address &&
        previous.tokenId === next.tokenId &&
        previous.status === next.status
    )

    const first = makeBalance({ address: "a", tokenId: "t" })
    stabilize([first])

    const drifted = makeBalance({
      address: "a",
      tokenId: "t",
      values: [{ type: "free", label: "free", amount: "101" }],
    })
    const [emitted] = stabilize([drifted])
    expect(emitted).toBe(first)
  })

  test("stabilizes per-item: one changed balance leaves the others reference-stable", () => {
    const stabilize = createBalanceStabilizer()

    const a1 = makeBalance({ address: "a", tokenId: "t" })
    const b1 = makeBalance({ address: "b", tokenId: "t" })
    stabilize([a1, b1])

    const a2 = makeBalance({ address: "a", tokenId: "t" }) // unchanged content
    const b2 = makeBalance({
      address: "b",
      tokenId: "t",
      values: [{ type: "free", label: "free", amount: "999" }],
    })
    const [emittedA, emittedB] = stabilize([a2, b2])
    expect(emittedA).toBe(a1)
    expect(emittedB).toBe(b2)
  })
})

describe("classifySmallAmountDrift", () => {
  const classify = classifySmallAmountDrift(10n) // 0.1%

  test("identical balances classify as equal", () => {
    const a = makeBalance({ address: "a", tokenId: "t" })
    const b = makeBalance({ address: "a", tokenId: "t" })
    expect(classify(a, b)).toBe("equal")
  })

  test("sub-tolerance amount movement classifies as drift", () => {
    const previous = makeBalance({
      address: "a",
      tokenId: "t",
      values: [{ type: "free", label: "free", amount: "1000000000" }],
    })
    const next = makeBalance({
      address: "a",
      tokenId: "t",
      values: [{ type: "free", label: "free", amount: "1000100000" }], // +0.01%
    })
    expect(classify(previous, next)).toBe("drift")
  })

  test("beyond-tolerance amount movement classifies as changed", () => {
    const previous = makeBalance({
      address: "a",
      tokenId: "t",
      values: [{ type: "free", label: "free", amount: "1000000000" }],
    })
    const next = makeBalance({
      address: "a",
      tokenId: "t",
      values: [{ type: "free", label: "free", amount: "1100000000" }], // +10%
    })
    expect(classify(previous, next)).toBe("changed")
  })

  test("zero → non-zero classifies as changed", () => {
    const previous = makeBalance({
      address: "a",
      tokenId: "t",
      values: [{ type: "free", label: "free", amount: "0" }],
    })
    const next = makeBalance({
      address: "a",
      tokenId: "t",
      values: [{ type: "free", label: "free", amount: "1" }],
    })
    expect(classify(previous, next)).toBe("changed")
  })

  test("simple `value` balances drift within tolerance", () => {
    const previous = {
      address: "a",
      tokenId: "t",
      networkId: "1",
      source: "evm-native",
      status: "live",
      value: "1000000000",
    } as IBalance
    const next = { ...previous, value: "1000050000" } as IBalance // +0.005%
    expect(classify(previous, next)).toBe("drift")
  })

  test("status or structural changes classify as changed", () => {
    const previous = makeBalance({ address: "a", tokenId: "t", status: "cache" })
    const next = makeBalance({ address: "a", tokenId: "t", status: "live" })
    expect(classify(previous, next)).toBe("changed")

    const withExtra = makeBalance({
      address: "a",
      tokenId: "t",
      values: [
        { type: "free", label: "free", amount: "100" },
        { type: "locked", label: "frozen", amount: "1" },
      ],
    })
    expect(classify(makeBalance({ address: "a", tokenId: "t" }), withExtra)).toBe("changed")
  })
})

describe("batch-aligned drift release", () => {
  test("a real change releases drift-held balances in the same emission", () => {
    let clock = 0
    const stabilize = createBalanceStabilizer(
      (previous, next) => {
        const amountOf = (b: IBalance) =>
          ("values" in b ? (b.values ?? []) : [])[0]?.amount as string | undefined
        return amountOf(previous) === amountOf(next) ? "equal" : "drift"
      },
      { driftRefreshMs: 30_000, now: () => clock }
    )

    const make = (address: string, amount: string) =>
      makeBalance({
        address,
        tokenId: "t",
        values: [{ type: "free", label: "free", amount }],
      })

    const a1 = make("a", "100")
    const b1 = make("b", "100")
    stabilize([a1, b1])

    // a drifts within its window → held
    clock = 10_000
    expect(stabilize([make("a", "101"), b1])[0]).toBe(a1)

    // b structurally changes (status flip → classified changed by the fallback path is
    // not used here; the custom comparator returns drift for amount-only, so change b's
    // amount beyond drift by making it a NEW balance id instead): use a fresh balance c
    clock = 20_000
    const a3 = make("a", "102")
    const c1 = make("c", "50")
    const [emittedA, , emittedC] = stabilize([a3, b1, c1])
    // the new balance c forces an emission → a's held drift is released alongside it
    expect(emittedC).toBe(c1)
    expect(emittedA).toBe(a3)
  })
})
