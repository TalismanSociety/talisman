import { CONSENT_KINDS, type ConsentKind } from "@common/analytics/schema"

import type { SettingsStoreData } from "../app/store.settings"
import type { Transmission } from "./transmission"
import type { Consent, Disposition, KindConsent } from "./types"

export const consentFromSettings = ({
  useAnalyticsTracking,
  useErrorTracking,
}: Pick<SettingsStoreData, "useAnalyticsTracking" | "useErrorTracking">): Consent => ({
  usage:
    useAnalyticsTracking === undefined ? "pending" : useAnalyticsTracking ? "granted" : "denied",
  error: useErrorTracking ? "granted" : "denied",
})

export const transmits = (kind: ConsentKind, transmission: Transmission): boolean => {
  switch (transmission.mode) {
    case "off":
      return false
    case "posthog":
      return kind === "usage" ? transmission.usage : transmission.errorTracking
    case "dev_log":
      return true
  }
}

export type Admission = Exclude<Disposition, "rejected" | "filtered">

const ADMISSION_BY_CONSENT: Record<KindConsent, Admission> = {
  granted: "queued",
  pending: "held",
  denied: "dropped_consent",
}

export const admit = (
  kind: ConsentKind,
  consent: Consent,
  transmission: Transmission
): Admission =>
  transmits(kind, transmission) ? ADMISSION_BY_CONSENT[consent[kind]] : "dropped_off"

export type UsageTransition =
  | "none"
  | "opt_in_onboarding"
  | "decline"
  | "opt_in_settings"
  | "opt_out"

export type ConsentPlan = {
  usage: UsageTransition
  purge: readonly ConsentKind[]
}

const USAGE_TRANSITIONS: Partial<Record<`${KindConsent}>${KindConsent}`, UsageTransition>> = {
  "pending>granted": "opt_in_onboarding",
  "pending>denied": "decline",
  "denied>granted": "opt_in_settings",
  "granted>denied": "opt_out",
}

export const planConsent = (applied: Consent | null, current: Consent): ConsentPlan => ({
  usage: applied ? (USAGE_TRANSITIONS[`${applied.usage}>${current.usage}`] ?? "none") : "none",
  purge: CONSENT_KINDS.filter((kind) => current[kind] === "denied"),
})
