import { DEBUG, IS_FIREFOX } from "extension-shared"

import { analyticsStore } from "../domains/analytics/store"
import { PostHogCaptureProperties } from "../domains/analytics/types"
import { settingsStore } from "../domains/app/store.settings"
import { withGeneralReport } from "./GeneralReport"

class TalismanAnalytics {
  #enabled = !IS_FIREFOX && Boolean(process.env.POSTHOG_AUTH_TOKEN)

  async capture(eventName: string, properties?: PostHogCaptureProperties) {
    if (!this.#enabled) return

    try {
      // have to put this manual check here because posthog is buggy and will not respect our settings
      // https://github.com/PostHog/posthog-js/issues/336
      const allowTracking = await settingsStore.get("useAnalyticsTracking")
      if (allowTracking === false) return

      const captureProperties = await withGeneralReport(properties)
      await analyticsStore.capture(eventName, captureProperties)
    } catch (cause) {
      const error = new Error("Failed to capture posthog event", { cause })
      DEBUG && console.error(error) // eslint-disable-line no-console
    }
  }

  async captureDelayed(
    eventName: string,
    properties?: PostHogCaptureProperties,
    delaySeconds = 900,
  ) {
    analyticsStore.captureDelayed(eventName, properties, delaySeconds)
  }
}

export const talismanAnalytics = new TalismanAnalytics()
