import { describe, expect, it } from "vitest"

import { catalogue } from "./catalogue"
import { appFlagChangeOf, settingChangeOf } from "./settings"

describe("settingChangeOf", () => {
  it("sends a setting mobile shares under mobile's name", () => {
    expect(settingChangeOf("hideBalances", true)).toEqual({ key: "blurBalances", value: true })
    expect(settingChangeOf("hideDust", false)).toEqual({ key: "hideSmallBalance", value: false })
    expect(settingChangeOf("selectedCurrency", "eur")).toEqual({ key: "currency", value: "eur" })
  })

  it("keeps consent, its own events and state that is no user choice out", () => {
    expect(settingChangeOf("useAnalyticsTracking", false)).toBeNull()
    expect(settingChangeOf("useErrorTracking", false)).toBeNull()
    expect(settingChangeOf("autoLockMinutes", 5)).toBeNull()
    expect(settingChangeOf("dtaoSlippage", 1)).toBeNull()
    expect(
      settingChangeOf("selectedAccount", "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
    ).toBeNull()
  })

  it("drops a value that is not the setting's declared type", () => {
    expect(settingChangeOf("earnDiscoverProviderFilter", "not an identifier")).toBeNull()
    expect(settingChangeOf("earnDiscoverProviderFilter", "x".repeat(33))).toBeNull()
    expect(settingChangeOf("swapSlippage", Number.NaN)).toBeNull()
  })

  it("reads a cleared setting as null", () => {
    expect(settingChangeOf("earnDiscoverTypeFilter", null)).toEqual({
      key: "earnDiscoverTypeFilter",
      value: null,
    })
  })

  it("sends a Don't show again choice", () => {
    expect(appFlagChangeOf("hideGetStarted", true)).toEqual({ key: "hideGetStarted", value: true })
    expect(appFlagChangeOf("hasBraveWarningBeenShown", true)).toBeNull()
  })

  it("produces values the catalogue accepts", () => {
    const changes = [
      settingChangeOf("swapSlippage", 0.5),
      settingChangeOf("ledgerTransportType", "usb"),
      settingChangeOf("earnDiscoverTypeFilter", null),
      appFlagChangeOf("hideEarnDisclaimer", true),
    ]
    for (const change of changes)
      expect(catalogue.setting_changed.schema.safeParse(change).success, change?.key).toBe(true)
  })
})
