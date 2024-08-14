import type { Properties } from "posthog-js"
import { DEBUG } from "extension-shared"
import posthog from "posthog-js"

import { initPosthog, setPosthogOptInPreference } from "../config/posthog"
import { settingsStore } from "../domains/app/store.settings"
import { withGeneralReport } from "./GeneralReport"

class TalismanAnalytics {
  #enabled = Boolean(process.env.POSTHOG_AUTH_TOKEN)

  constructor() {
    if (!this.#enabled) return

    // subscribe posthog opt-in preferences to settingsStore.useAnalyticsTracking changes
    settingsStore.observable.subscribe(({ useAnalyticsTracking }) =>
      setPosthogOptInPreference(useAnalyticsTracking)
    )

    // set posthog opt-in preferences to current value of settingsStore.useAnalyticsTracking
    settingsStore.get("useAnalyticsTracking").then((useAnalyticsTracking) => {
      setPosthogOptInPreference(useAnalyticsTracking)

      // init posthog (*after* opt-in preferences have been set)
      initPosthog()
    })
  }

  async capture(eventName: string, properties?: Properties) {
    if (!this.#enabled) return

    try {
      // have to put this manual check here because posthog is buggy and will not respect our settings
      // https://github.com/PostHog/posthog-js/issues/336
      const allowTracking = await settingsStore.get("useAnalyticsTracking")

      // we need to allow tracking during onboarding, while value is not defined
      // so we need to explicitly check for false
      if (allowTracking === false) return

      const captureProperties = await withGeneralReport(properties)
      posthog.capture(eventName, captureProperties)
    } catch (cause) {
      const error = new Error("Failed to capture posthog event", { cause })
      DEBUG && console.error(error) // eslint-disable-line no-console
    }
  }

  async captureDelayed(eventName: string, properties?: Properties, delaySeconds = 900) {
    setTimeout(() => this.capture(eventName, properties), delaySeconds * 1000 * Math.random())
  }
}

export const talismanAnalytics = new TalismanAnalytics()
