import { beforeEach, describe, expect, it, vi } from "vitest"

import { changeLanguage, reportAppFlagWrite, reportSettingWrite } from "./settings"

const tracked = vi.hoisted(() => ({ calls: [] as unknown[][] }))
vi.mock("@ui/api/track", () => ({
  track: (...call: unknown[]) => {
    tracked.calls.push(call)
  },
}))

const i18n = vi.hoisted(() => ({ language: "en" }))
vi.mock("i18next", () => ({
  default: {
    get language() {
      return i18n.language
    },
    changeLanguage: async (language: string) => {
      i18n.language = language
    },
  },
}))

describe("reportSettingWrite", () => {
  beforeEach(() => {
    tracked.calls = []
  })

  it("sends a change once, and nothing when the value stays the same", () => {
    reportSettingWrite("hideBalances", false, true)
    reportSettingWrite("hideBalances", true, true)
    reportSettingWrite("tokensSortBy", "total", "total")

    expect(tracked.calls).toEqual([["setting_changed", { key: "blurBalances", value: true }]])
  })

  it("sends the auto-lock timer as mobile's auto_lock_changed, in milliseconds", () => {
    reportSettingWrite("autoLockMinutes", 0, 5)

    expect(tracked.calls).toEqual([["auto_lock_changed", { timeout_ms: 300_000 }]])
  })

  it("sends nothing for consent and lists", () => {
    reportSettingWrite("useAnalyticsTracking", true, false)
    reportSettingWrite("selectableCurrencies", ["usd"], ["usd", "eur"])
    reportAppFlagWrite("popupSizeDelta", [0, 0], [0, 30])

    expect(tracked.calls).toEqual([])
  })
})

describe("changeLanguage", () => {
  beforeEach(() => {
    tracked.calls = []
    i18n.language = "en"
  })

  it("sends mobile's language_changed when the language changes", async () => {
    await changeLanguage("en")
    await changeLanguage("zh-CN")

    expect(i18n.language).toBe("zh-CN")
    expect(tracked.calls).toEqual([["language_changed", { language_code: "zh-CN" }]])
  })
})
