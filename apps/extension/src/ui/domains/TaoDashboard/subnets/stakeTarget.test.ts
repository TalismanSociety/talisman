import { describe, expect, it } from "vitest"

import { getStakeTarget } from "./stakeTarget"

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"

describe("getStakeTarget", () => {
  it("preselects the first staking account that holds TAO", () => {
    expect(getStakeTarget([ALICE, BOB], [BOB], false)).toEqual({ address: BOB })
  })

  it("prefers a funded account over the loading fallback", () => {
    expect(getStakeTarget([ALICE, BOB], [BOB], true)).toEqual({ address: BOB })
  })

  it("allows staking with the only staking account while balances load", () => {
    expect(getStakeTarget([ALICE], [], true)).toEqual({ address: ALICE })
  })

  it("lets the user pick among several staking accounts while balances load", () => {
    expect(getStakeTarget([ALICE, BOB], [], true)).toEqual({ address: undefined })
  })

  it("disables staking once balances have loaded and no staking account holds TAO", () => {
    expect(getStakeTarget([ALICE, BOB], [], false)).toBeNull()
  })

  it("disables staking without a staking account, even while balances load", () => {
    expect(getStakeTarget([], [], true)).toBeNull()
  })

  it("ignores funded accounts that cannot stake", () => {
    expect(getStakeTarget([ALICE], [BOB], false)).toBeNull()
  })
})
