import type { TrackRequest } from "@common/analytics/catalogue"
import type { RiskVerdict } from "@common/analytics/dapp"
import type { ExceptionMechanism, ExceptionReport } from "@common/analytics/exceptionReport"
import type { ConsentKind, PropertyValue } from "@common/analytics/schema"

export type Disposition =
  | "queued"
  | "held"
  | "dropped_consent"
  | "dropped_off"
  | "rejected"
  | "filtered"

export type RequestRiskReport = { id: string; verdict: RiskVerdict }

export interface AnalyticsMessages {
  "pri(analytics.track)": [TrackRequest, Disposition]
  "pri(analytics.requestRisk)": [RequestRiskReport, boolean]
  "pri(analytics.exception)": [ExceptionReport, Disposition]
}

export type WireTime = number & { readonly __brand: "WireTime" }

export type AnalyticsSession = {
  id: string
  offsetMs: number
  startedAt: number
  lastActivityAt: number
}

export type KindConsent = "pending" | "granted" | "denied"
export type Consent = {
  readonly usage: KindConsent
  readonly error: Exclude<KindConsent, "pending">
}

export type ExceptionFrame = {
  platform: "web:javascript"
  filename?: string
  function?: string
  lineno?: number
  colno?: number
  in_app: boolean
  chunk_id?: string
}

export type ExceptionEntry = {
  type: string
  value: string
  stacktrace?: { type: "raw"; frames: ExceptionFrame[] }
  mechanism: {
    type: ExceptionMechanism | "chained"
    handled?: boolean
    synthetic?: boolean
    exception_id: number
    parent_id?: number
    source?: "cause" | "member"
  }
}

export type WireProperties = Readonly<
  Record<string, PropertyValue | undefined | readonly ExceptionEntry[]>
>

export type RedactedProperties = WireProperties & { readonly __brand: "RedactedProperties" }

export type WireEvent = {
  event: string
  distinct_id: string
  properties: RedactedProperties
  timestamp: string
  /** PostHog merges resent copies on it. */
  uuid: string
}

export type QueuedEventRecord = {
  uuid: string
  sendAt: WireTime
  kind: ConsentKind
  wire: WireEvent
}

export type AnalyticsState = {
  session: AnalyticsSession | null
  appliedConsent: Consent | null
}
