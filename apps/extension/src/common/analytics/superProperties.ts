import type { PosthogPropertyType } from "./schema"

export const UI_CONTEXTS = [
  "popup",
  "popup_window",
  "dashboard",
  "onboarding",
  "support",
  "background",
] as const
export type UiContext = (typeof UI_CONTEXTS)[number]

export const APP_VARIANTS = ["development", "preview", "production"] as const
export type AppVariant = (typeof APP_VARIANTS)[number]

export const BROWSERS = ["chrome", "edge", "brave", "firefox", "other"] as const
export type Browser = (typeof BROWSERS)[number]

export type SuperProperties = {
  appVersion: string
  appBuild: string
  appVariant: AppVariant
  browser: Browser
  os: string
  locale: string
  ui_context: UiContext
  $lib: "talisman-extension"
  $lib_version: string
  $app_version: string
  $os: string
  $browser: string
}

export type SuperPropertyName = keyof SuperProperties

export const superPropertyDefinitions: {
  readonly [K in SuperPropertyName]: {
    description: string
    posthogType: PosthogPropertyType
    values?: readonly string[]
  }
} = {
  appVersion: { description: "Extension version, from package.json.", posthogType: "String" },
  appBuild: { description: "Short git sha of the build.", posthogType: "String" },
  appVariant: {
    description:
      "development: a dev build. production: a production build installed from a store. preview: anything else, such as an unpacked release candidate.",
    posthogType: "String",
    values: APP_VARIANTS,
  },
  browser: { description: "Browser family.", posthogType: "String", values: BROWSERS },
  os: {
    description: "Operating system, from chrome.runtime.getPlatformInfo().",
    posthogType: "String",
  },
  locale: {
    description: "Browser locale (navigator.language), not the wallet language.",
    posthogType: "String",
  },
  ui_context: {
    description: "Extension context that emitted the event.",
    posthogType: "String",
    values: UI_CONTEXTS,
  },
  $lib: { description: "Client library name.", posthogType: "String" },
  $lib_version: { description: "Same as appVersion.", posthogType: "String" },
  $app_version: {
    description: "Same as appVersion, under PostHog's standard name.",
    posthogType: "String",
  },
  $os: {
    description: "Operating system, under PostHog's standard name and values.",
    posthogType: "String",
  },
  $browser: {
    description: "Browser, under PostHog's standard name and values.",
    posthogType: "String",
  },
}
