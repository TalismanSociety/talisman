import { describe, expect, it } from "vitest"

import { getSweepableRemainder } from "./nominationRemainder"

const position = { stake: 100n, maxAmount: 100n, minKeep: 20n, minAmount: 2n }

describe("getSweepableRemainder", () => {
  it("flags a partial amount that leaves less than the minimum, with the largest valid one", () => {
    expect(getSweepableRemainder({ ...position, amount: 90n })).toEqual({ maxPartial: 80n })
  })

  it("accepts an amount that keeps exactly the minimum", () => {
    expect(getSweepableRemainder({ ...position, amount: 80n })).toBeNull()
  })

  it("accepts unstaking everything", () => {
    expect(getSweepableRemainder({ ...position, amount: 100n })).toBeNull()
  })

  it("accepts max when conviction locks keep the rest, which the chain sweeps to exit", () => {
    expect(getSweepableRemainder({ ...position, maxAmount: 90n, amount: 90n })).toBeNull()
  })

  it("accepts no amount", () => {
    expect(getSweepableRemainder({ ...position, amount: 0n })).toBeNull()
  })

  it("offers no partial amount when the position is too small for one", () => {
    expect(getSweepableRemainder({ ...position, stake: 21n, maxAmount: 21n, amount: 10n })).toEqual(
      { maxPartial: null }
    )
  })

  it("offers no partial amount when the minimum is the whole stake, even without an operation minimum", () => {
    expect(
      getSweepableRemainder({ stake: 20n, maxAmount: 20n, minKeep: 20n, minAmount: 0n, amount: 5n })
    ).toEqual({ maxPartial: null })
  })
})
