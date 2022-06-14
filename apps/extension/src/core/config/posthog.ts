import posthog from "posthog-js"

const unsafeProperties = [
  "$os",
  "$browser",
  "$device_type",
  "$current_url",
  "$host",
  "$pathname",
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
}

export const initPosthog = (allowTracking: boolean = false) => {
  if (process.env.POSTHOG_AUTH_TOKEN) {
    posthog.init(process.env.POSTHOG_AUTH_TOKEN, {
      api_host: "https://app.posthog.com",
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      persistence: "localStorage",
      ip: false,
      loaded: (posthogInstance) => {
        if (allowTracking && !posthogInstance.has_opted_in_capturing())
          posthogInstance.opt_in_capturing()
      },
      sanitize_properties: (properties, eventName) => {
        // We can remove all the posthog user profiling properties except for those that are required for PostHog to work
        const requiredProperties = Object.keys(properties).reduce((result, key) => {
          if (!unsafeProperties.includes(key)) result[key] = properties[key]
          return result
        }, {} as posthog.Properties)
        return {
          ...requiredProperties,
          ...talismanProperties,
        }
      },
    })
  }
}
