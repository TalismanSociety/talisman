import {
  type DappMethod,
  describeDappRequest,
  type RequestOutcome,
  type RiskVerdict,
} from "@common/analytics/dapp"
import { classifyError, type ErrorCategory } from "@common/analytics/errorCategory"
import { toDurationMs } from "@common/analytics/schema"
import type { ChainPlatform } from "@common/analytics/transactions"

import type { RequestEnding, RequestFact } from "../../libs/requests/store"
import { isBlockaidMalicious } from "../app/protector/blockaidSiteScan"
import { passwordStore } from "../app/store.password"
import type { RequestDecision } from "./observeMessage"
import { track } from "./track"

export type Decision = { outcome: RequestDecision; at: number; errorCategory?: ErrorCategory }

type Pending = {
  method: DappMethod
  platform: ChainPlatform
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
      return "rejected"
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
  if (outcome !== "rejected") return undefined
  if (decision?.errorCategory) return decision.errorCategory
  return decision?.outcome === "approved" && error ? classifyError(error) : undefined
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
        const { method, platform } = describeDappRequest(fact.request)
        const siteFlagged = isFlaggedSite(fact.request.url)
        pending.set(fact.request.id, {
          method,
          platform,
          createdAt: fact.at,
          siteFlagged,
        })
        track("dapp_request_received", {
          method,
          platform,
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
        request.decision = { ...request.decision, outcome: "rejected", errorCategory }
    },

    noteRisk(id: string, verdict: RiskVerdict): void {
      const request = pending.get(id)
      if (request) request.verdict = verdict
    },
  }
}

export const dappRequestTracker = createDappRequestTracker()
