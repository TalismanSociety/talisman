import { describe, expect, it } from "vitest"

import { type BittensorFullExitUnstakeInputs, getBittensorFullExitUnstake } from "./fullExitUnstake"

const FULL_EXIT: BittensorFullExitUnstakeInputs = {
  isRootUnbond: true,
  amountIn: 1000n,
  totalStakedPlancks: 1000n,
  availableToUnstakePlancks: 1000n,
  includeClaim: true,
  holdIntervalBlocks: 0n,
  isHoldIntervalReady: true,
}

describe("getBittensorFullExitUnstake", () => {
  it("allows the claim-first order when the whole unlocked position exits and the hold window is proven off", () => {
    expect(getBittensorFullExitUnstake(FULL_EXIT)).toBe(true)
  })

  it("rejects a partial unstake", () => {
    expect(getBittensorFullExitUnstake({ ...FULL_EXIT, amountIn: 999n })).toBe(false)
  })

  it("rejects when no amount is set", () => {
    expect(getBittensorFullExitUnstake({ ...FULL_EXIT, amountIn: null })).toBe(false)
    expect(
      getBittensorFullExitUnstake({
        ...FULL_EXIT,
        amountIn: 0n,
        totalStakedPlancks: 0n,
        availableToUnstakePlancks: 0n,
      })
    ).toBe(false)
  })

  it("rejects when a conviction lock keeps part of the position staked", () => {
    expect(getBittensorFullExitUnstake({ ...FULL_EXIT, availableToUnstakePlancks: 400n })).toBe(
      false
    )
  })

  it("rejects when the claim is not batched", () => {
    expect(getBittensorFullExitUnstake({ ...FULL_EXIT, includeClaim: false })).toBe(false)
  })

  it("rejects when the hold window is enabled", () => {
    expect(getBittensorFullExitUnstake({ ...FULL_EXIT, holdIntervalBlocks: 480n })).toBe(false)
  })

  it("fails closed while the interval read is unresolved, even at its zero default", () => {
    expect(getBittensorFullExitUnstake({ ...FULL_EXIT, isHoldIntervalReady: false })).toBe(false)
  })

  it("rejects subnet unbonds", () => {
    expect(getBittensorFullExitUnstake({ ...FULL_EXIT, isRootUnbond: false })).toBe(false)
  })
})
