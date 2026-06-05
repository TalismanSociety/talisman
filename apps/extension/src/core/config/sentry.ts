import { DEBUG, IS_FIREFOX } from "@common/constants"
import { log } from "@common/log"
import {
  BrowserClient,
  type captureEvent,
  type captureException,
  type captureMessage,
  defaultStackParser,
  getDefaultIntegrations,
  makeFetchTransport,
  Scope,
} from "@sentry/browser"
import type { Event } from "@sentry/types"
import { firstValueFrom, of, ReplaySubject, timeout } from "rxjs"

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
// this module is shared by the background and UI contexts: each bundle gets its own
// isolated client + scope, and the global Sentry carrier is never touched

type SentryContext = "background" | "ui"

// set by init(), for DEBUG logging purposes only
let context: SentryContext | "unknown" = "unknown"

// filter integrations that use the global variable
const integrations = getDefaultIntegrations({}).filter((defaultIntegration) => {
  return !["BrowserApiErrors", "Breadcrumbs", "GlobalHandlers"].includes(defaultIntegration.name)
})

const client = new BrowserClient({
  enabled: !IS_FIREFOX,
  environment: process.env.BUILD,
  dsn: process.env.SENTRY_DSN,
  transport: makeFetchTransport,
  stackParser: defaultStackParser,
  integrations: integrations,
  release: process.env.RELEASE,
  sampleRate: 1,
  ignoreErrors: [
    /(No window with id: )(\d+).?/,
    /(disconnected from wss)[(]?:\/\/[\w./:-]+: \d+:: Normal Closure[)]?/,
    /^disconnected from .+: [0-9]+:: .+$/,
    /^unsubscribed from .+: [0-9]+:: .+$/,
    /(Could not establish connection. Receiving end does not exist.)/,
    /(track.getCapabilities is not a function)/,
  ],
  // prevents sending the event if user has disabled error tracking
  beforeSend: async (event, hint) => {
    // Track extra information about IndexedDB errors
    await trackIndexedDbErrorExtras(event, hint)

    // Print to console instead of Sentry in DEBUG/development builds
    if (DEBUG) {
      log.error(`[DEBUG - ${context}] Sentry event occurred`, event)
      return null
    }

    // fall back to not sending if the setting can't be read (e.g. corrupted storage),
    // so the event is dropped instead of hanging in the client forever
    const errorTracking = await firstValueFrom(
      useErrorTracking.pipe(timeout({ first: 5_000, with: () => of(false) }))
    )
    return errorTracking ? event : null
  },
})

const scope = new Scope()
scope.setClient(client)

scope.addEventProcessor(async (event: Event) => {
  if (event.request?.url) {
    event.request.url = normalizeUrl(event.request.url)
  }

  if (event.exception?.values && event.exception.values.length > 0) {
    const firstValue = event.exception.values[0]
    if (!firstValue.stacktrace?.frames) return event
    firstValue.stacktrace.frames = firstValue.stacktrace.frames.map((frame) => {
      if (frame.filename) frame.filename = normalizeUrl(frame.filename)
      return frame
    })
  }

  return event
})

type TalismanSentryClient = {
  init: (context: SentryContext) => void
  captureException: typeof captureException
  captureEvent: typeof captureEvent
  captureMessage: typeof captureMessage
}

export const sentry: TalismanSentryClient = {
  init: (ctx) => {
    context = ctx
    client.init()
  },
  captureException: (exception, hintOrContext) => {
    // From https://github.com/getsentry/sentry-javascript/blob/0d558dea4a580dce7717f5093ad3b62a3c4733bd/packages/core/src/utils/prepareEvent.ts#L358
    const hint =
      isScopeOrFunction(hintOrContext) || isScopeContext(hintOrContext)
        ? { captureContext: hintOrContext }
        : hintOrContext

    return scope.captureException(exception, hint)
  },
  captureEvent: (event, hint) => scope.captureEvent(event, hint),
  captureMessage: (message, captureContext) => {
    const level = typeof captureContext === "string" ? captureContext : undefined
    const context = typeof captureContext !== "string" ? { captureContext } : undefined

    return scope.captureMessage(message, level, context)
  },
}

// From https://github.com/getsentry/sentry-javascript/blob/0d558dea4a580dce7717f5093ad3b62a3c4733bd/packages/core/src/utils/prepareEvent.ts#L386C1-L396C1
const captureContextKeys = [
  "user",
  "level",
  "extra",
  "contexts",
  "tags",
  "fingerprint",
  "requestSession",
  "propagationContext",
]
const isScopeOrFunction = (hint?: object) => hint instanceof Scope || typeof hint === "function"
const isScopeContext = (hint?: object) =>
  Object.keys(hint ?? {}).some((key) => captureContextKeys.includes(key))
