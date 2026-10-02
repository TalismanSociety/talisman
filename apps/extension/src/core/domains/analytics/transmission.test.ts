import { describe, expect, it } from "vitest"

import {
  type AnalyticsRemoteConfig,
  DEFAULT_POSTHOG_URL,
  parseAnalyticsRemoteConfig,
  resolveTransmission,
} from "./transmission"

const analytics = {
  posthogApiKey: " phc_test ",
  errorTrackingEnabled: true,
  browsers: { chrome: true, firefox: false },
}

describe("parseAnalyticsRemoteConfig", () => {
  it("reads the section and trims the key", () => {
    expect(
      parseAnalyticsRemoteConfig({ postHogUrl: "https://proxy.example/batch/", analytics })
    ).toEqual({
      postHogUrl: "https://proxy.example/batch/",
      analytics: { ...analytics, posthogApiKey: "phc_test" },
    })
  })

  it("falls back to the default endpoint when the url is missing or invalid", () => {
    expect(parseAnalyticsRemoteConfig({ analytics })?.postHogUrl).toBe(DEFAULT_POSTHOG_URL)
    expect(parseAnalyticsRemoteConfig({ postHogUrl: "nope", analytics })?.postHogUrl).toBe(
      DEFAULT_POSTHOG_URL
    )
  })

  it.each([
    ["a config without the section, like the bundled default", { postHogUrl: DEFAULT_POSTHOG_URL }],
    [
      "a section without browsers",
      { analytics: { posthogApiKey: "k", errorTrackingEnabled: true } },
    ],
    ["no config", undefined],
  ])("is null for %s", (_, raw) => {
    expect(parseAnalyticsRemoteConfig(raw)).toBeNull()
  })
})

describe("resolveTransmission", () => {
  const config = (overrides: Partial<AnalyticsRemoteConfig["analytics"]> = {}) => ({
    postHogUrl: DEFAULT_POSTHOG_URL,
    analytics: { ...analytics, posthogApiKey: "phc_test", ...overrides },
  })

  it.each([
    ["a dev build, whatever the config", true, "chrome", config(), { mode: "dev_log" }],
    ["a missing section", false, "chrome", null, { mode: "unconfigured" }],
    ["an empty key", false, "chrome", config({ posthogApiKey: "" }), { mode: "off" }],
    [
      "the chrome build",
      false,
      "chrome",
      config(),
      {
        mode: "posthog",
        endpoint: DEFAULT_POSTHOG_URL,
        apiKey: "phc_test",
        usage: true,
        errorTracking: true,
      },
    ],
    [
      "the firefox build turned off, for usage and error reports alike",
      false,
      "firefox",
      config(),
      {
        mode: "posthog",
        endpoint: DEFAULT_POSTHOG_URL,
        apiKey: "phc_test",
        usage: false,
        errorTracking: false,
      },
    ],
    [
      "error reports turned off on every browser",
      false,
      "chrome",
      config({ errorTrackingEnabled: false }),
      {
        mode: "posthog",
        endpoint: DEFAULT_POSTHOG_URL,
        apiKey: "phc_test",
        usage: true,
        errorTracking: false,
      },
    ],
  ] as const)("%s", (_, isDevBuild, build, value, expected) => {
    expect(resolveTransmission({ isDevBuild, build, config: value })).toEqual(expected)
  })
})
