import {
  BrowserClient,
  Scope,
  captureException,
  defaultStackParser,
  getDefaultIntegrations,
  makeFetchTransport,
} from "@sentry/browser"
import { Event } from "@sentry/types"
import { DEBUG } from "extension-shared"
import { ReplaySubject, firstValueFrom } from "rxjs"

import { trackIndexedDbErrorExtras } from "../domains/app/store.errors"
import { settingsStore } from "../domains/app/store.settings"

const normalizeUrl = (url: string) => {
  return url.replace(/(webpack_require__@)?(moz|chrome)-extension:\/\/[^/]+\//, "~/")
}

// cache latest value of useErrorTracking so that we don't need to check localStorage for every error sent to sentry
const useErrorTracking = new ReplaySubject<boolean>(1)
settingsStore.observable.subscribe((settings) => useErrorTracking.next(settings.useErrorTracking))

// setup of the Sentry scope following this guide:
// https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/

// filter integrations that use the global variable
const integrations = getDefaultIntegrations({}).filter((defaultIntegration) => {
  return !["BrowserApiErrors", "TryCatch", "Breadcrumbs", "GlobalHandlers"].includes(
    defaultIntegration.name
  )
})

const client = new BrowserClient({
  enabled: true,
  environment: process.env.BUILD,
  dsn: process.env.SENTRY_DSN,
  transport: makeFetchTransport,
  stackParser: defaultStackParser,
  integrations: integrations,
  release: process.env.RELEASE,
  sampleRate: 1,
  maxBreadcrumbs: 20,
  ignoreErrors: [
    /(No window with id: )(\d+).?/,
    /(disconnected from wss)[(]?:\/\/[\w./:-]+: \d+:: Normal Closure[)]?/,
    /^disconnected from .+: [0-9]+:: .+$/,
    /^unsubscribed from .+: [0-9]+:: .+$/,
    /(Could not establish connection. Receiving end does not exist.)/,
  ],
  // prevents sending the event if user has disabled error tracking
  beforeSend: async (event, hint) => {
    // Track extra information about IndexedDB errors
    await trackIndexedDbErrorExtras(event, hint)

    // Print to console instead of Sentry in DEBUG/development builds
    if (DEBUG) {
      console.error("[DEBUG - Background] Sentry event occurred", event) // eslint-disable-line no-console
      return null
    }

    const errorTracking = await firstValueFrom(useErrorTracking)
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

const scope = new Scope()
scope.setClient(client)

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

export const sentry = {
  init: () => client.init(),
  captureException: (...[exception, hint]: Parameters<typeof captureException>) => {
    if (hint) {
      if ("extra" in hint && hint.extra) scope.setExtras(hint.extra)
      if ("tags" in hint && hint.tags) scope.setTags(hint.tags)
    }
    scope.captureException(exception)
    if (hint) scope.clear()
  },
  captureEvent: (...args: Parameters<typeof scope.captureEvent>) => scope.captureEvent(...args),
  captureMessage: (...args: Parameters<typeof scope.captureMessage>) =>
    scope.captureMessage(...args),
}
