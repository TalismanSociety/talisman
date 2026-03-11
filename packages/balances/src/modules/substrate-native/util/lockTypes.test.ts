import { vi } from "vitest"

import { filterBaseLocks, getLockedType, getLockTitle } from "./lockTypes"

const makeLock = (label: string) => ({
  type: "locked" as const,
  label,
  // biome-ignore lint/suspicious/noExplicitAny: partial mock for testing
  amount: { planck: 100n } as any,
})

describe("getLockedType", () => {
  it("returns other-unknown for undefined", () => {
    expect(getLockedType(undefined)).toBe("other-unknown")
  })

  it("returns other-unknown for non-string inputs", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing runtime guard with invalid types
    expect(getLockedType(null as any)).toBe("other-unknown")
    // biome-ignore lint/suspicious/noExplicitAny: testing runtime guard with invalid types
    expect(getLockedType(123 as any)).toBe("other-unknown")
  })

  describe("vesting locks", () => {
    it.each([
      ["vesting", "vesting"],
      ["calamvst", "vesting"],
      ["ormlvest", "vesting"],
    ])('maps "%s" → "%s"', (input, expected) => {
      expect(getLockedType(input)).toBe(expected)
    })
  })

  describe("democracy locks", () => {
    it.each([
      ["pyconvot", "democracy"],
      ["democrac", "democracy"],
      ["democracy", "democracy"],
      ["phrelect", "democracy"],
      ["voting", "democracy"],
      ["candidac", "democracy"],
      ["councilo", "democracy"],
      ["proposal", "democracy"],
    ])('maps "%s" → "%s"', (input, expected) => {
      expect(getLockedType(input)).toBe(expected)
    })
  })

  describe("staking locks", () => {
    it.each([
      ["staking", "staking"],
      ["stkngdel", "staking"],
      ["stkngcol", "staking"],
      ["kiltpstk", "staking"],
      ["boundsta", "staking"],
    ])('maps "%s" → "%s"', (input, expected) => {
      expect(getLockedType(input)).toBe(expected)
    })
  })

  describe("dapp-staking locks", () => {
    it.each([
      ["dapstake", "dapp-staking"],
      ["appstake", "dapp-staking"],
      // BUG: "dappstaking" contains "staking", so the staking check (line 35) matches
      // before the dappstaking check (line 41), making that branch unreachable.
      ["dappstaking", "staking"],
    ])('maps "%s" → "%s"', (input, expected) => {
      expect(getLockedType(input)).toBe(expected)
    })
  })

  describe("known other locks", () => {
    it.each([
      ["invitemb", "other-invitemb"],
      ["bounty", "other-bounty"],
      ["wg-something", "other-wg-something"],
      ["pdexlock", "other-pdexlock"],
      ["phala/sp", "other-phala/sp"],
      ["aca/earn", "other-aca/earn"],
      ["stk_stks", "other-stk_stks"],
    ])('maps "%s" → "%s"', (input, expected) => {
      expect(getLockedType(input)).toBe(expected)
    })
  })

  it("falls through to other-<input> for unknown strings and warns", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(getLockedType("totally_unknown")).toBe("other-totally_unknown")
    expect(warnSpy).toHaveBeenCalledWith("unknown locked type: totally_unknown")
    warnSpy.mockRestore()
  })
})

describe("filterBaseLocks", () => {
  it("returns all locks when only base locks exist", () => {
    const locks = [makeLock("fees"), makeLock("misc")]
    expect(filterBaseLocks(locks)).toEqual(locks)
  })

  it("filters out base locks when non-base locks exist", () => {
    const locks = [makeLock("fees"), makeLock("staking"), makeLock("misc")]
    const result = filterBaseLocks(locks)
    expect(result).toEqual([makeLock("staking")])
  })

  it("returns all locks when only non-base locks exist", () => {
    const locks = [makeLock("staking"), makeLock("vesting")]
    expect(filterBaseLocks(locks)).toEqual(locks)
  })

  it("returns empty array for empty input", () => {
    expect(filterBaseLocks([])).toEqual([])
  })
})

describe("getLockTitle", () => {
  it.each([
    ["democracy", "Governance"],
    ["crowdloan", "Crowdloan"],
    ["nompools-staking", "Pooled Staking"],
    ["nompools-unbonding", "Pooled Staking"],
    ["subtensor-staking", "Root Staking"],
    ["dapp-staking", "DApp Staking"],
    ["fees", "Locked (Fees)"],
    ["misc", "Locked"],
    ["other-something", "Locked"],
  ] as const)('label "%s" → "%s"', (label, expected) => {
    expect(getLockTitle({ label, meta: {} })).toBe(expected)
  })

  it("applies upperFirst for unmatched labels", () => {
    expect(getLockTitle({ label: "staking", meta: {} })).toBe("Staking")
    expect(getLockTitle({ label: "vesting", meta: {} })).toBe("Vesting")
  })

  it("returns falsy label as-is", () => {
    expect(getLockTitle({ label: "", meta: {} })).toBe("")
  })
})
