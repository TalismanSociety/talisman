import { describe, expect, it } from "vitest"

import { detectBrowser, resolveAppVariant, uiContextFromSenderUrl } from "./environment"

describe("resolveAppVariant", () => {
  it.each([
    ["dev", "dev", "development", "development"],
    ["dev", "production", "normal", "development"],
    ["production", "production", "normal", "production"],
    ["production", "production", "admin", "production"],
    ["production", "production", "development", "preview"],
    ["production", "production", "sideload", "preview"],
    ["production", "production", undefined, "preview"],
    ["production", "canary", "normal", "preview"],
    ["production", "dev", "normal", "preview"],
  ])("build %s, build type %s, install type %s: %s", (build, buildType, installType, expected) => {
    expect(resolveAppVariant({ build, buildType, installType })).toBe(expected)
  })
})

describe("detectBrowser", () => {
  const brands = (...names: string[]) => names.map((brand) => ({ brand }))

  it.each([
    [brands("Not.A/Brand", "Chromium", "Google Chrome"), "Mozilla/5.0 Chrome/141", "chrome"],
    [brands("Chromium", "Microsoft Edge"), "Mozilla/5.0 Chrome/141 Edg/141", "edge"],
    [brands("Brave", "Chromium"), "Mozilla/5.0 Chrome/141", "brave"],
    [brands("Chromium"), "Mozilla/5.0 Chrome/141", "other"],
    [undefined, "Mozilla/5.0 (Macintosh) Gecko/20100101 Firefox/143.0", "firefox"],
  ])("%o %s: %s", (brandList, userAgent, expected) => {
    expect(detectBrowser({ brands: brandList, userAgent })).toBe(expected)
  })
})

describe("uiContextFromSenderUrl", () => {
  const page = (path: string) => `chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno${path}`

  it.each([
    [page("/popup.html?embedded#/portfolio"), "popup"],
    [
      page("/popup.html#/sign/eth/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"),
      "popup_window",
    ],
    [page("/dashboard.html#/settings/general"), "dashboard"],
    [page("/onboarding.html#/password"), "onboarding"],
    [page("/support.html"), "support"],
    [page("/dashboard.html#/popup.html?embedded"), "dashboard"],
    [undefined, "background"],
    ["not a url", "background"],
  ])("%s: %s", (url, expected) => {
    expect(uiContextFromSenderUrl(url)).toBe(expected)
  })
})
