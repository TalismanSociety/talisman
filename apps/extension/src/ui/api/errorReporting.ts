import {
  buildExceptionReport,
  installGlobalErrorHandlers,
  type ReportErrorOptions,
} from "@common/analytics/exceptionReport"

import { api } from "./api"
import { pageContext } from "./pageContext"

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

export const installErrorHandlers = () => installGlobalErrorHandlers(window, reportError)
