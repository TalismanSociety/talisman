import {
  buildExceptionReport,
  installGlobalErrorHandlers,
  type ReportErrorOptions,
} from "@common/analytics/exceptionReport"
import type { UiContext } from "@common/analytics/superProperties"
import { log } from "@common/log"

import { analyticsEngine } from "./engine"
import {
  createExceptionThrottle,
  parseExceptionReport,
  toExceptionEvent,
  withNetworkId,
} from "./exception"
import { analyticsNetworkId } from "./txContext"
import type { Disposition } from "./types"

const throttle = createExceptionThrottle()

const resolveNetworkId = (networkId: string) =>
  analyticsNetworkId({ networkId }).catch(() => undefined)

/**
 * The one intake for reports from every realm: schema, ignore list, scrubber, fingerprint,
 * throttle, then the engine (consent, transmission, error-only id, real time, immediate flush).
 * Every outcome lands in the dev log with its disposition.
 */
export const receiveException = async (
  raw: unknown,
  uiContext: UiContext
): Promise<Disposition> => {
  const realNow = Date.now()
  const parsed = parseExceptionReport(raw)
  if (!parsed.ok) return analyticsEngine.capture({ result: parsed, uiContext, realNow })

  const result = toExceptionEvent(parsed.report, { extensionOrigin: chrome.runtime.getURL("") })
  if (!result.ok) return analyticsEngine.capture({ result, uiContext, realNow })

  if (!throttle.admit(result.event.properties.$exception_fingerprint, realNow))
    return analyticsEngine.capture({
      result: { ok: false, name: "$exception", issues: ["throttled"], disposition: "filtered" },
      uiContext,
      realNow,
    })

  const networkId = parsed.report.networkId && (await resolveNetworkId(parsed.report.networkId))
  const event = networkId ? withNetworkId(result.event, networkId) : result.event
  return analyticsEngine.capture({ result: { ...result, event }, uiContext, realNow })
}

/** Resolves to the event id when the report was queued, else null. Never rejects. */
export const reportError = (
  thrown: unknown,
  options: ReportErrorOptions = {}
): Promise<string | null> => {
  const report = buildExceptionReport(thrown, options)
  return receiveException(report, "background").then(
    (disposition) => (disposition === "queued" ? report.id : null),
    (cause) => {
      log.error("[analytics] exception report failed", { cause })
      return null
    }
  )
}

/** Call once, synchronously, at the top level of the service worker. */
export const installErrorHandlers = () => installGlobalErrorHandlers(self, reportError)

if (process.env.BUILD === "dev")
  Object.assign(globalThis, {
    talismanAnalytics: {
      ...(globalThis as { talismanAnalytics?: object }).talismanAnalytics,
      /** Thrown from bundled code, so the dev log shows real background.js frames. */
      probeException: (message: string) =>
        setTimeout(() => {
          throw new Error(message)
        }),
    },
  })
