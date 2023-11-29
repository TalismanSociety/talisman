import { DEBUG } from "@core/constants"
import { errorsStore, settingsStore } from "@core/domains/app"
import * as SentryBrowser from "@sentry/browser"
import * as SentryReact from "@sentry/react"
import { Event } from "@sentry/types"
import { Dexie, DexieError } from "dexie"
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
    const rootError = event.reason

    const errorChain = []
    for (let error = rootError; error !== undefined; error = error?.cause) {
      errorChain.push(error)
    }

    if (errorChain.some((error) => error instanceof Dexie.DexieError)) {
      // handle dexie errors

      const dexieError: DexieError = errorChain.find((error) => error instanceof Dexie.DexieError)
      if (
        dexieError.name === Dexie.errnames.Abort &&
        // only follow this branch if the AbortError's `inner` error is not a QuotaExceeded error
        dexieError.inner?.name !== Dexie.errnames.QuotaExceeded
      ) {
        // eslint-disable-next-line no-console
        DEBUG && console.warn("Setting databaseUnavailable to true", event)
        errorsStore.mutate((store) => {
          store.databaseUnavailable = true
          store.DexieAbortLog.push(Date.now())
          return store
        })

        event.preventDefault()
        return
      }

      if (dexieError.name === Dexie.errnames.DatabaseClosed) {
        // eslint-disable-next-line no-console
        DEBUG && console.warn("Setting databaseUnavailable to true", event)
        errorsStore.mutate((store) => {
          store.databaseUnavailable = true
          store.DexieDatabaseClosedLog.push(Date.now())
          return store
        })

        event.preventDefault()
        return
      }

      if (
        dexieError.name === Dexie.errnames.QuotaExceeded ||
        // can sometimes be raised as the `inner` error of an AbortError
        dexieError.inner?.name === Dexie.errnames.QuotaExceeded
      ) {
        // eslint-disable-next-line no-console
        DEBUG && console.warn("Setting databaseQuotaExceeded to true", event)
        errorsStore.mutate((store) => {
          store.databaseQuotaExceeded = true
          store.DexieQuotaExceededLog.push(Date.now())
          return store
        })

        event.preventDefault()
        return
      }
    } else {
      // handle non-dexie errors

      if (
        rootError instanceof Error &&
        rootError.message.match(/^disconnected from .+: [0-9]+:: .+$/)
      ) {
        // eslint-disable-next-line no-console
        DEBUG && console.warn("An unhandled disconnection has been caught", event)
        event.preventDefault()
        return
      }

      if (
        rootError instanceof Error &&
        rootError.message.match(/^unsubscribed from .+: [0-9]+:: .+$/)
      ) {
        // eslint-disable-next-line no-console
        DEBUG && console.warn("An uncatchable polkadotjs error has been caught", event)
        event.preventDefault()
        return
      }
    }

    sentry.captureEvent(rootError)
  })
}
