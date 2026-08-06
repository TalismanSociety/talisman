import { describe, expect, it } from "vitest"

import { ERC20_UNLIMITED_ALLOWANCE, isUnlimitedAllowance } from "../allowance"

describe("isUnlimitedAllowance", () => {
  it("flags the near-max values a spender can use in place of uint256 max", () => {
    expect(isUnlimitedAllowance(ERC20_UNLIMITED_ALLOWANCE)).toBe(true)
    expect(isUnlimitedAllowance(ERC20_UNLIMITED_ALLOWANCE - 1n)).toBe(true)
    expect(isUnlimitedAllowance(ERC20_UNLIMITED_ALLOWANCE / 2n)).toBe(true) // uint256 max / 2
    expect(isUnlimitedAllowance(2n ** 160n - 1n)).toBe(true) // uint160 max (Permit2)
  })

  it("does not flag an allowance a token supply could reach", () => {
    expect(isUnlimitedAllowance(0n)).toBe(false)
    expect(isUnlimitedAllowance(10n ** 6n)).toBe(false) // 1 USDC
    expect(isUnlimitedAllowance(10n ** 33n)).toBe(false) // the whole supply of a 18 decimals memecoin
  })
})
