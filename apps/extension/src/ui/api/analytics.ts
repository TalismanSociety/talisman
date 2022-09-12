import posthog from "posthog-js"

import { api } from "./api"

export type AnalyticsEventName = "Pageview" | "Goto" | "GotoExternal" | "Interact" | "Submit"
export type AnalyticsContainer = "Fullscreen" | "Popup"
export type AnalyticsFeature = "Onboarding" // | "Porfolio" | "Settings"

export type AnalyticsPage = {
  container: AnalyticsContainer
  feature: AnalyticsFeature
  featureVersion: number
  page: string
}

export type AnalyticsEvent = AnalyticsPage & {
  name: AnalyticsEventName
  action?: string
  site?: string
  properties?: posthog.Properties
}

export const sendAnalyticsEvent = (event: AnalyticsEvent) => {
  const { name: eventName, properties = {}, ...options } = event
  api.analyticsCapture({
    eventName,
    options: { ...properties, ...options },
  })
}
