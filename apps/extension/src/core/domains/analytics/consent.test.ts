import { describe, expect, it } from "vitest"

import { admit, consentFromSettings, planConsent } from "./consent"
import type { Transmission } from "./transmission"
import type { Consent } from "./types"

const consent = (usage: Consent["usage"], error: Consent["error"] = "granted"): Consent => ({
  usage,
  error,
})

const POSTHOG: Transmission = {
  mode: "posthog",
  endpoint: "https://z.talisman.xyz/batch/",
  apiKey: "phc_test",
}

describe("consentFromSettings", () => {
  it.each([
    [undefined, true, consent("pending", "granted")],
    [true, false, consent("granted", "denied")],
    [false, true, consent("denied", "granted")],
  ] as const)("useAnalyticsTracking %s, useErrorTracking %s", (usage, error, expected) => {
    expect(consentFromSettings({ useAnalyticsTracking: usage, useErrorTracking: error })).toEqual(
      expected
    )
  })
})

describe("admit", () => {
  it.each([
    ["usage", consent("granted"), POSTHOG, "queued"],
    ["usage", consent("pending"), POSTHOG, "held"],
    ["usage", consent("denied"), POSTHOG, "dropped_consent"],
    ["error", consent("denied", "granted"), POSTHOG, "queued"],
    ["error", consent("granted", "denied"), POSTHOG, "dropped_consent"],
    ["usage", consent("granted"), { mode: "off" }, "dropped_off"],
    ["error", consent("granted"), { mode: "off" }, "dropped_off"],
    ["usage", consent("granted"), { mode: "dev_log" }, "queued"],
  ] as const)(
    "%s event, consent %o, transmission %o: %s",
    (kind, current, transmission, expected) => {
      expect(admit(kind, current, transmission)).toBe(expected)
    }
  )
})

describe("planConsent", () => {
  it.each([
    [null, consent("granted"), "none", []],
    [null, consent("denied", "denied"), "none", ["usage", "error"]],
    [consent("pending"), consent("granted"), "opt_in_onboarding", []],
    [consent("pending"), consent("denied"), "decline", ["usage"]],
    [consent("denied"), consent("granted"), "opt_in_settings", []],
    [consent("granted"), consent("denied"), "opt_out", ["usage"]],
    [consent("granted"), consent("granted", "denied"), "none", ["error"]],
    [consent("granted"), consent("granted"), "none", []],
    [consent("denied"), consent("denied"), "none", ["usage"]],
    [consent("pending"), consent("pending"), "none", []],
  ] as const)("applied %o, current %o: %s, purges %o", (applied, current, usage, purge) => {
    expect(planConsent(applied, current)).toEqual({ usage, purge })
  })
})
