import { describe, expect, test } from "vitest"

import type { IBalance } from "../../types"
import { createBalanceStabilizer } from "./stabilizeBalances"

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
