import {
  type DappRequestKind,
  describeDappRequest,
  type RequestOutcome,
  type RiskVerdict,
} from "@common/analytics/dapp"
import { classifyError, type ErrorCategory } from "@common/analytics/errorCategory"
import { toDurationMs } from "@common/analytics/schema"

import type { RequestEnding, RequestFact } from "../../libs/requests/store"
import { isBlockaidMalicious } from "../app/protector/blockaidSiteScan"
import { passwordStore } from "../app/store.password"
import type { RequestDecision } from "./observeMessage"
import { track } from "./track"

export type Decision =
  | { outcome: RequestDecision; at: number }
  | { outcome: "failed"; at: number; errorCategory: ErrorCategory }

type Pending = DappRequestKind & {
  createdAt: number
  siteFlagged: boolean
  decision?: Decision
  verdict?: RiskVerdict
}

export const outcomeOf = (
  ending: RequestEnding,
  decision: Decision | undefined
): RequestOutcome => {
  switch (ending) {
    case "resolved":
      return "approved"
    case "rejected":
      return decision?.outcome === "approved" || decision?.outcome === "failed"
        ? "failed"
        : "rejected"
    case "window_closed":
      return decision?.outcome ?? "closed"
    case "port_disconnected":
      return decision?.outcome ?? "expired"
    case "open_failed":
      return "expired"
    case "ignored":
      return "closed"
  }
}

export const failureCategoryOf = (
  outcome: RequestOutcome,
  decision: Decision | undefined,
  error: Error | undefined
): ErrorCategory | undefined => {
  if (outcome !== "failed") return undefined
  if (decision?.outcome === "failed") return decision.errorCategory
  return error ? classifyError(error) : "unknown"
}

export const verdictOf = ({ verdict, siteFlagged }: Pick<Pending, "verdict" | "siteFlagged">) =>
  verdict ?? (siteFlagged ? "malicious" : "unscanned")

const isFlaggedSite = (url: string | undefined) =>
  !!url && URL.canParse(url) && isBlockaidMalicious(new URL(url).hostname)

export const createDappRequestTracker = () => {
  const pending = new Map<string, Pending>()

  return {
    onFact(fact: RequestFact): void {
      if (fact.type === "created") {
        const kind = describeDappRequest(fact.request)
        const siteFlagged = isFlaggedSite(fact.request.url)
        pending.set(fact.request.id, { ...kind, createdAt: fact.at, siteFlagged })
        track("dapp_request_received", {
          method: kind.method,
          platform: kind.platform,
          request_type: kind.requestType,
          dapp_domain: kind.dappDomain,
          wallet_locked: passwordStore.isLoggedIn.value !== "TRUE",
          site_flagged: siteFlagged,
        })
        return
      }

      const request = pending.get(fact.request.id)
      if (!request) return
      pending.delete(fact.request.id)

      const { decision } = request
      const outcome = outcomeOf(fact.ending, decision)
      const errorCategory = failureCategoryOf(outcome, decision, fact.error)
      track("dapp_request_resolved", {
        method: request.method,
        platform: request.platform,
        request_type: request.requestType,
        dapp_domain: request.dappDomain,
        outcome,
        time_to_decision_ms: toDurationMs((decision?.at ?? fact.at) - request.createdAt),
        risk_verdict: verdictOf(request),
        ...(errorCategory && { error_category: errorCategory }),
      })
    },

    noteDecision(id: string, outcome: RequestDecision, at: number): void {
      const request = pending.get(id)
      if (request) request.decision = { outcome, at }
    },

    noteApprovalFailure(id: string, errorCategory: ErrorCategory): void {
      const request = pending.get(id)
      if (request?.decision)
        request.decision = { outcome: "failed", at: request.decision.at, errorCategory }
    },

    noteRisk(id: string, verdict: RiskVerdict): void {
      const request = pending.get(id)
      if (request) request.verdict = verdict
    },
  }
}

export const dappRequestTracker = createDappRequestTracker()
