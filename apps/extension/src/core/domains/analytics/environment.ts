import type {
  AppVariant,
  Browser,
  SuperProperties,
  UiContext,
} from "@common/analytics/superProperties"

export type Environment = Omit<SuperProperties, "ui_context">

export const resolveAppVariant = ({
  build,
  buildType,
  installType,
}: {
  build: string | undefined
  buildType: string | undefined
  installType: string | undefined
}): AppVariant => {
  if (build === "dev") return "development"
  if (buildType === "canary") return "canary"
  if (buildType === "production" && (installType === "normal" || installType === "admin"))
    return "production"
  return "preview"
}

const BRANDS: readonly [string, Browser][] = [
  ["Brave", "brave"],
  ["Microsoft Edge", "edge"],
  ["Google Chrome", "chrome"],
]

export const detectBrowser = ({
  brands = [],
  userAgent,
}: {
  brands?: readonly { brand: string }[]
  userAgent: string
}): Browser => {
  if (/Firefox\//.test(userAgent)) return "firefox"
  return BRANDS.find(([brand]) => brands.some((entry) => entry.brand === brand))?.[1] ?? "other"
}

export const toBrowserLanguage = (locale: string | undefined): string => {
  const language = locale?.split("-")[0].toLowerCase() ?? ""
  return /^[a-z]{2,3}$/.test(language) ? language : "unknown"
}

const POSTHOG_OS: Record<string, string> = {
  mac: "Mac OS X",
  win: "Windows",
  linux: "Linux",
  cros: "Chrome OS",
  android: "Android",
  openbsd: "OpenBSD",
  fuchsia: "Fuchsia",
}

const POSTHOG_BROWSER: Record<Browser, string> = {
  chrome: "Chrome",
  edge: "Microsoft Edge",
  brave: "Brave",
  firefox: "Firefox",
  other: "Other",
}

type NavigatorWithBrands = Navigator & { userAgentData?: { brands?: { brand: string }[] } }

let environment: Promise<Environment> | undefined

export const readEnvironment = (): Promise<Environment> => {
  environment ??= (async () => {
    const [self, platform] = await Promise.all([
      chrome.management.getSelf().catch(() => undefined),
      chrome.runtime.getPlatformInfo().catch(() => undefined),
    ])
    const nav = navigator as NavigatorWithBrands
    const browser = detectBrowser({ brands: nav.userAgentData?.brands, userAgent: nav.userAgent })
    const os = platform?.os ?? "unknown"
    const version = process.env.VERSION ?? "unknown"
    return {
      appVersion: version,
      appBuild: process.env.GIT_SHA ?? "unknown",
      appVariant: resolveAppVariant({
        build: process.env.BUILD,
        buildType: process.env.BUILD_TYPE,
        installType: self?.installType,
      }),
      browser,
      os,
      browser_language: toBrowserLanguage(nav.language),
      $lib: "talisman-extension",
      $lib_version: version,
      $app_version: version,
      $os: POSTHOG_OS[os] ?? os,
      $browser: POSTHOG_BROWSER[browser],
    }
  })()
  return environment
}

export const uiContextFromSenderUrl = (url: string | undefined): UiContext => {
  if (!url || !URL.canParse(url)) return "background"
  const { pathname, searchParams } = new URL(url)
  switch (pathname) {
    case "/popup.html":
      return searchParams.has("embedded") ? "popup" : "popup_window"
    case "/dashboard.html":
      return "dashboard"
    case "/onboarding.html":
      return "onboarding"
    case "/support.html":
      return "support"
    default:
      return "background"
  }
}
