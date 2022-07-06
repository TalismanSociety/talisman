import * as SentryBrowser from "@sentry/browser"
import * as SentryReact from "@sentry/react"
import { Event } from "@sentry/types"
import { Integrations } from "@sentry/tracing"
import { settingsStore } from "@core/domains/app/store.settings"
import { ReplaySubject, firstValueFrom } from "rxjs"
import { DEBUG } from "@core/constants"

const normalizeUrl = (url: string) => {
  return url.replace(/(webpack_require__@)?(moz|chrome)-extension:\/\/[^/]+\//, "~/")
}

// cache latest value of useErrorTracking so that we don't need to check localStorage for every error sent to sentry
const useErrorTracking = new ReplaySubject<boolean>(1)
settingsStore.observable.subscribe((settings) => useErrorTracking.next(settings.useErrorTracking))

export const initSentry = (sentry: typeof SentryBrowser | typeof SentryReact) => {
  sentry.init({
    enabled: !DEBUG,
    environment: process.env.BUILD,
    dsn: process.env.SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing()],
    release: process.env.SENTRY_VERSION,
    sampleRate: 1,
    // prevents sending the event if user has disabled error tracking
    beforeSend: async (event) => ((await firstValueFrom(useErrorTracking)) ? event : null),

    // Set tracesSampleRate to capture 5%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 0.05,
  })

  sentry.configureScope((scope) => {
    scope.addEventProcessor(async (event: Event) => {
      if (event.request && event.request.url) {
        event.request.url = normalizeUrl(event.request.url)
      }

      if (event.exception?.values && event.exception.values.length > 0) {
        const firstValue = event.exception.values[0]
        if (!firstValue.stacktrace?.frames) return event
        firstValue.stacktrace.frames = firstValue.stacktrace.frames.map((frame: any) => {
          frame.filename = normalizeUrl(frame.filename)
          return frame
        })
      }

      return event
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    sentry.captureEvent(event.reason)
  })
}
