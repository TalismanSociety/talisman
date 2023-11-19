import { DEBUG } from "@core/constants"
import { settingsStore } from "@core/domains/app/store.settings"
import * as SentryBrowser from "@sentry/browser"
import * as SentryReact from "@sentry/react"
import { Event } from "@sentry/types"
import { ReplaySubject, firstValueFrom } from "rxjs"

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
    integrations: [new SentryBrowser.BrowserTracing()],
    release: process.env.RELEASE,
    sampleRate: 1,
    maxBreadcrumbs: 20,
    ignoreErrors: [
      /(No window with id: )(\d+).?/,
      /(disconnected from wss)[(]?:\/\/[\w./:-]+: \d+:: Normal Closure[)]?/,
    ],
    // prevents sending the event if user has disabled error tracking
    beforeSend: async (event) => {
      const errorTracking = await firstValueFrom(useErrorTracking)

      // Print to console in development (because we won't be using sentry in that env)
      // eslint-disable-next-line no-console
      if (DEBUG) console.error("[DEBUG] Sentry event occurred", event)

      return errorTracking ? event : null
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    beforeBreadcrumb: (breadCrumb, hint) => {
      if (breadCrumb.data?.url) {
        breadCrumb.data.url = normalizeUrl(breadCrumb.data.url)
      }
      return breadCrumb
    },

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
