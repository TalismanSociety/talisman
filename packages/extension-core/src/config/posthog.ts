import assert from "assert"

import type { Properties } from "posthog-js"
import * as Sentry from "@sentry/browser"
import { DEBUG } from "extension-shared"
import posthog from "posthog-js"
import { v4 as uuidV4 } from "uuid"

import { appStore } from "../domains/app/store.app"

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

/**
 * Initializes the posthog client.
 *
 * It is recommended to call `setPosthogOptInPreference` with the user's opt-in preference before calling this.
 */
export const initPosthog = async () => {
  if (!process.env.POSTHOG_AUTH_TOKEN) return

  let posthogDistinctId: string | undefined = undefined
  try {
    // Identify the posthog client
    //
    // We have to do this manually, because we don't have access to `localStorage` in the background script,
    // and `localStorage` is the only built-in way for posthog to persist the distinct_id.
    posthogDistinctId = await appStore.get("posthogDistinctId")

    // if this Talisman instance doesn't already have a persisted distinct_id, randomly generate one
    if (posthogDistinctId === undefined) {
      posthogDistinctId = uuidV4()
      await appStore.set({ posthogDistinctId })
    }
  } catch (cause) {
    const error = new Error("Failed to identify posthog client", { cause })
    console.error(error) // eslint-disable-line no-console
    Sentry.captureException(error)
  }
  assert(typeof posthogDistinctId === "string", "posthogDistinctId must be defined")

  posthog.init(process.env.POSTHOG_AUTH_TOKEN, {
    // use the persisted distinct_id
    bootstrap: { distinctID: posthogDistinctId },
    api_host: "https://app.posthog.com",
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    // localStorage persistence doesn't work in background script (`localStorage` is not defined)
    persistence: "memory",
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

/**
 * Configures the user's opt-in preference on the posthog client.
 *
 * @param optInPreference `true` if the user has explicitly opted in, `false` if the user has explicitly opted out, otherwise `undefined`.
 */
export const setPosthogOptInPreference = (optInPreference: boolean | undefined) => {
  const posthogOptedIn = posthog.has_opted_in_capturing()
  const posthogOptedOut = posthog.has_opted_out_capturing()

  switch (optInPreference) {
    case true:
      if (!posthogOptedIn || posthogOptedOut) posthog.opt_in_capturing()
      break
    case false:
      if (posthogOptedIn || !posthogOptedOut) posthog.opt_out_capturing()
      break
    case undefined:
      if (posthogOptedIn || posthogOptedOut) posthog.clear_opt_in_out_capturing()
      break
  }
}
