import * as Sentry from "@sentry/browser"
import { DEBUG, log } from "extension-shared"
import { v4 } from "uuid"

import { StorageProvider } from "../../libs/Store"
import { remoteConfigStore } from "../app/store.remoteConfig"
import { settingsStore } from "../app/store.settings"
import { PostHogCaptureProperties } from "./types"

type PostHogSendProperties = PostHogCaptureProperties & { distinct_id: string }

export type AnalyticsEvent = {
  event: string
  properties: PostHogSendProperties
  timestamp: number
}

export type AnalyticsSendEvent = {
  event: string
  properties: PostHogSendProperties
  timestamp: string
}

type AnalyticsData = { data: AnalyticsEvent[]; distinctId?: string }

const TALISMAN_PROPERTIES = {
  appVersion: process.env.VERSION,
  appBuild: process.env.BUILD,
  testBuild: DEBUG || ["dev", "qa", "ci"].includes(process.env.BUILD as string),
}
const DEFAULT_ANALYTICS_STATE = { data: [] }
class AnalyticsStore extends StorageProvider<AnalyticsData> {
  // the isReady promise prevents events being added to the queue while the analytics are being sent
  isReady: Promise<boolean> = new Promise((resolve) => resolve(true))

  constructor(name: string) {
    super(name, DEFAULT_ANALYTICS_STATE)
    setInterval(async () => await this.send(), 60_000)
  }

  async getDistinctId() {
    try {
      // Identify the posthog client
      //
      // We have to do this manually, because we don't have access to `localStorage` in the background script,
      // and `localStorage` is the only built-in way for posthog to persist the distinct_id.
      let posthogDistinctId = await this.get("distinctId")

      // if this Talisman instance doesn't already have a persisted distinct_id, randomly generate one
      if (posthogDistinctId === undefined) {
        posthogDistinctId = v4()
        await this.mutate((data) => ({ ...data, distinctId: posthogDistinctId }))
      }
      return posthogDistinctId
    } catch (cause) {
      const error = new Error("Failed to identify posthog client", { cause })
      console.error(error) // eslint-disable-line no-console
      Sentry.captureException(error)
    }
    return
  }

  async capture(
    eventName: string,
    rawProperties?: PostHogCaptureProperties,
    eventTimestamp?: number,
  ) {
    log.debug("AnalyticsStore.capture", { eventName, rawProperties, eventTimestamp })
    const timestamp = eventTimestamp ?? Date.now()
    const distinct_id = await this.getDistinctId()
    if (!distinct_id) return

    const properties = {
      ...rawProperties,
      ...TALISMAN_PROPERTIES,
      distinct_id,
    }

    await this.isReady
    await this.mutate(({ data, distinctId }) => ({
      distinctId,
      data: [...data, { event: eventName, properties, timestamp }],
    }))
  }

  captureDelayed(eventName: string, properties?: PostHogCaptureProperties, delaySeconds = 1800) {
    // add a random delay of up to 30 min to avoid deanonymisation of user events
    const timestamp = Date.now() + delaySeconds * 1000 * Math.random()
    this.capture(eventName, properties, timestamp)
  }

  async send() {
    const enabled = await settingsStore.get("useAnalyticsTracking")
    if (!enabled) return
    log.debug("AnalyticsStore.send")

    await this.isReady

    const sendInner = async () => {
      if (!process.env.POSTHOG_AUTH_TOKEN) {
        log.warn("POSTHOG_AUTH_TOKEN is not set, not sending analytics")
        return true
      }

      const { data } = await this.get()
      const currentTime = Date.now()
      // split the data into two arrays, one for the current time, and to be kept for the future
      const { toKeep, toSend } = data.reduce<{
        toSend: AnalyticsSendEvent[]
        toKeep: AnalyticsEvent[]
      }>(
        (result, item) => {
          if (item.timestamp < currentTime)
            result.toSend.push({ ...item, timestamp: new Date(item.timestamp).toISOString() })
          else result.toKeep.push(item)
          return result
        },
        { toSend: [], toKeep: [] },
      )
      if (toSend.length === 0) return true

      const url = await remoteConfigStore.get("postHogUrl")
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      const payload = {
        api_key: process.env.POSTHOG_AUTH_TOKEN,
        historical_migration: false,
        batch: toSend,
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error(await response.text())
      } catch (error) {
        log.error("Failed to send analytics", { error }) // eslint-disable-line no-console
        // do not mutate state if sending analytics fails
        return true
      }

      await this.mutate(({ distinctId }) => ({ data: toKeep, distinctId }))
      log.debug("AnalyticsStore.send success: ", toSend.length)
      return true
    }

    this.isReady = sendInner()
  }
}

export const analyticsStore = new AnalyticsStore("analytics")
