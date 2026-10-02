import type { TrackRequest } from "@common/analytics/catalogue"
import type { ConsentKind, PropertyValue } from "@common/analytics/schema"

export type Disposition = "queued" | "held" | "dropped_consent" | "dropped_off" | "rejected"

export interface AnalyticsMessages {
  "pri(analytics.track)": [TrackRequest, Disposition]
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
  filename: string
  function: string
  lineno: number | null
  colno: number | null
  in_app: boolean
  chunk_id?: string
}

export type ExceptionEntry = {
  type: string
  value: string
  stacktrace: { type: "raw"; frames: ExceptionFrame[] }
  mechanism: { handled: boolean; synthetic: boolean; type: string }
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
  installId: string
  errorId: string
  session: AnalyticsSession | null
  appliedConsent: Consent | null
}
