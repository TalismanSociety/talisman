import { PostHogCaptureProperties } from "@extension/core/domains/analytics/types"

import { api } from "./api"

export type AnalyticsEventName = "Pageview" | "Goto" | "GotoExternal" | "Interact" | "Submit"
export type AnalyticsContainer = "Fullscreen" | "Popup"
export type AnalyticsFeature =
  | "Onboarding"
  | "Account Funding"
  | "Portfolio"
  | "Navigation"
  | "Send Funds"
  | "Settings"
  | "Transactions"
  | "Asset Discovery"
  | "Quick Settings"

export type AnalyticsPage = {
  container: AnalyticsContainer
  feature: AnalyticsFeature
  featureVersion: number
  page: string
}

// For UI, all events should be tied to the page they are sent from
export type AnalyticsEvent = AnalyticsPage & {
  name: AnalyticsEventName
  action?: string
  site?: string
  properties?: PostHogCaptureProperties
}

export const sendAnalyticsEvent = (event: AnalyticsEvent) => {
  const { name: eventName, properties = {}, ...options } = event
  api.analyticsCapture({
    eventName,
    options: { ...properties, ...options },
  })
}
