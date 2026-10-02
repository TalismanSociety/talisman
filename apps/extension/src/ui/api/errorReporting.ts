import {
  buildExceptionReport,
  installGlobalErrorHandlers,
  type ReportErrorOptions,
} from "@common/analytics/exceptionReport"

import { api } from "./api"
import { pageContext } from "./pageContext"

/**
 * The page builds the exception list, because only this realm knows the chunk ids of its frames.
 * The worker scrubs, fingerprints, gates and queues it. Resolves to the event id when the report
 * was queued, else null. Never rejects.
 */
export const reportError = (
  thrown: unknown,
  options: ReportErrorOptions = {}
): Promise<string | null> => {
  const report = buildExceptionReport(thrown, {
    ...options,
    screen: pageContext.screen ?? undefined,
  })
  return api.analyticsException(report).then(
    (disposition) => (disposition === "queued" ? report.id : null),
    () => null
  )
}

/** Call once per page, at module scope. */
export const installErrorHandlers = () => installGlobalErrorHandlers(window, reportError)
