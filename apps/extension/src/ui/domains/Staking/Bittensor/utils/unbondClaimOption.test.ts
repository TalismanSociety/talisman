import { describe, expect, it } from "vitest"

import {
  type BittensorUnbondClaimOptionInputs,
  getBittensorUnbondClaimOption,
} from "./unbondClaimOption"

const OPEN_OPTION: BittensorUnbondClaimOptionInputs = {
  isRootUnbond: true,
  withClaim: true,
  claimablePlancks: 100n,
  isClaimUnavailable: false,
  canSubmit: true,
}

describe("getBittensorUnbondClaimOption", () => {
  it("includes the claim when the gate is open and the user left it checked", () => {
    expect(getBittensorUnbondClaimOption(OPEN_OPTION)).toEqual({
      showRow: true,
      isRowDisabled: false,
      isChecked: true,
      includeClaim: true,
    })
  })

  it("shows the row unchecked without including the claim when the user opted out", () => {
    expect(getBittensorUnbondClaimOption({ ...OPEN_OPTION, withClaim: false })).toEqual({
      showRow: true,
      isRowDisabled: false,
      isChecked: false,
      includeClaim: false,
    })
  })

  it("hides the row when not unstaking from root", () => {
    const option = getBittensorUnbondClaimOption({ ...OPEN_OPTION, isRootUnbond: false })
    expect(option.showRow).toBe(false)
    expect(option.includeClaim).toBe(false)
  })

  it("hides the row when there is nothing to claim", () => {
    const option = getBittensorUnbondClaimOption({
      ...OPEN_OPTION,
      claimablePlancks: 0n,
      canSubmit: false,
    })
    expect(option.showRow).toBe(false)
    expect(option.includeClaim).toBe(false)
  })

  it("hides the row when the entitlement is gone", () => {
    const option = getBittensorUnbondClaimOption({
      ...OPEN_OPTION,
      isClaimUnavailable: true,
      canSubmit: false,
    })
    expect(option.showRow).toBe(false)
    expect(option.includeClaim).toBe(false)
  })

  it("disables the row unchecked when the claimable amount is below the network minimum", () => {
    expect(getBittensorUnbondClaimOption({ ...OPEN_OPTION, canSubmit: false })).toEqual({
      showRow: true,
      isRowDisabled: true,
      isChecked: false,
      includeClaim: false,
    })
  })

  it("never includes the claim while the gate reads are unresolved, even when checked", () => {
    const option = getBittensorUnbondClaimOption({ ...OPEN_OPTION, canSubmit: false })
    expect(option.includeClaim).toBe(false)
  })
})
