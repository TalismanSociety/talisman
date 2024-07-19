import { DEBUG } from "extension-shared"
import posthog, { Properties } from "posthog-js"

const unsafeProperties = [
  "$os",
  "$browser",
  "$device_type",
  "$browser_version",
  "$screen_height",
  "$screen_width",
  "$viewport_height",
  "$viewport_width",
  "$lib",
  "$lib_version",
  "$insert_id",
  "$time",
  "$device_id",
  "$active_feature_flags",
  "$initial_referrer",
  "$initial_referring_domain",
  "$referrer",
  "$referring_domain",
  "$session_id",
  "$window_id",
]

const talismanProperties = {
  appVersion: process.env.VERSION,
  appBuild: process.env.BUILD,
  testBuild: DEBUG || ["dev", "qa", "ci"].includes(process.env.BUILD as string),
}

export const initPosthog = () => {
  if (process.env.POSTHOG_AUTH_TOKEN) {
    posthog.init(process.env.POSTHOG_AUTH_TOKEN, {
      api_host: "https://app.posthog.com",
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      persistence: "localStorage",
      ip: false,
      sanitize_properties: (properties) => {
        // We can remove all the posthog user profiling properties except for those that are required for PostHog to work
        const requiredProperties = Object.keys(properties).reduce((result, key) => {
          if (!unsafeProperties.includes(key)) result[key] = properties[key]
          return result
        }, {} as Properties)
        return {
          ...requiredProperties,
          ...talismanProperties,
        }
      },
    })
  }
}
