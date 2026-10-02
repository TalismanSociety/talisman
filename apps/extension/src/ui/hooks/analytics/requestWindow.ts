import { describeDappRequest, type RiskVerdict } from "@common/analytics/dapp"
import { toDurationMs } from "@common/analytics/schema"
import type { ValidRequests } from "@core/libs/requests/types"
import { api } from "@ui/api"
import { pageContext } from "@ui/api/pageContext"
import { track } from "@ui/api/track"
import type { TokenRiskVerdict } from "@ui/domains/TokenRisk/tokenRiskScan"
import { useEffect } from "react"

import { pageStartedLocked } from "./performance"

/**
 * The first commit of a request window with its request, at the next frame: window load, unlock
 * and request fetch, not decoding, fees or the scan. Once per window.
 */
export const useReportRequestRendered = (request: ValidRequests | undefined) => {
  useEffect(() => {
    if (!request || pageContext.requestId) return
    pageContext.requestId = request.id
    const { method, platform } = describeDappRequest(request)
    requestAnimationFrame(() =>
      track("dapp_request_rendered", {
        method,
        platform,
        render_ms: toDurationMs(performance.now()),
        after_unlock: pageStartedLocked(),
      })
    )
  }, [request])
}

const VERDICTS: Record<"Benign" | "Warning" | "Malicious" | "Error", RiskVerdict> = {
  Benign: "benign",
  Warning: "warning",
  Malicious: "malicious",
  Error: "error",
}

/** The latest scan verdict of a request window; in-wallet scans have no request and send nothing. */
export const reportRequestRisk = (validationResult: keyof typeof VERDICTS) => {
  const id = pageContext.requestId
  if (id) api.analyticsRequestRisk({ id, verdict: VERDICTS[validationResult] }).catch(() => {})
}

/** A token Blockaid calls spam is a warning; an unknown verdict means no scan finished. */
const TOKEN_VERDICTS: Partial<Record<TokenRiskVerdict, keyof typeof VERDICTS>> = {
  Benign: "Benign",
  Warning: "Warning",
  Spam: "Warning",
  Malicious: "Malicious",
}

/** The token scan of a watch asset request, as the request's risk verdict. */
export const reportRequestTokenRisk = (verdict: TokenRiskVerdict) => {
  const validationResult = TOKEN_VERDICTS[verdict]
  if (validationResult) reportRequestRisk(validationResult)
}
