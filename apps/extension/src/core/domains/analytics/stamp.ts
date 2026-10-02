import type { ConsentKind } from "@common/analytics/schema"
import type { UiContext } from "@common/analytics/superProperties"

import type { Environment } from "./environment"
import type { ParsedEvent } from "./parse"
import { redactSecrets } from "./redactSecrets"
import { advanceSession, realTime, uuidv7 } from "./session"
import type {
  AnalyticsState,
  ExceptionEntry,
  QueuedEventRecord,
  RedactedProperties,
  WireProperties,
} from "./types"

type KindPolicy = {
  readonly identity: "install" | "error"
  readonly sessioned: boolean
  readonly flushImmediately: boolean
}

export const KIND_POLICY = {
  usage: { identity: "install", sessioned: true, flushImmediately: false },
  error: { identity: "error", sessioned: false, flushImmediately: true },
} as const satisfies Record<ConsentKind, KindPolicy>

const redactValue = (value: WireProperties[string]): WireProperties[string] => {
  if (typeof value === "string") return redactSecrets(value)
  if (typeof value !== "object" || value === null) return value
  return value.map((item) =>
    typeof item === "string" ? redactSecrets(item) : item
  ) as typeof value
}

/** Frames hold code positions, and a Chrome extension id is valid base58: redacting them would break symbolication. */
const redactExceptions = (entries: readonly ExceptionEntry[]): readonly ExceptionEntry[] =>
  entries.map((entry) => ({
    ...entry,
    type: redactSecrets(entry.type),
    value: redactSecrets(entry.value),
  }))

export const redactProperties = (properties: WireProperties): RedactedProperties =>
  Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      key === "$exception_list"
        ? redactExceptions(value as readonly ExceptionEntry[])
        : redactValue(value),
    ])
  ) as RedactedProperties

export const stampEvent = ({
  event,
  uiContext,
  environment,
  state,
  realNow,
  drawOffset,
}: {
  event: ParsedEvent
  uiContext: UiContext
  environment: Environment
  state: AnalyticsState
  realNow: number
  drawOffset: () => number
}): { record: QueuedEventRecord; state: AnalyticsState } => {
  const policy = KIND_POLICY[event.kind]
  const step = policy.sessioned ? advanceSession(state.session, realNow, drawOffset) : null
  const at = step?.at ?? realTime(realNow)
  const uuid = uuidv7(at)
  const record: QueuedEventRecord = {
    uuid,
    sendAt: at,
    kind: event.kind,
    wire: {
      event: event.name,
      distinct_id: policy.identity === "install" ? state.installId : state.errorId,
      timestamp: new Date(at).toISOString(),
      uuid,
      properties: redactProperties({
        ...environment,
        ui_context: uiContext,
        ...(event.screen && { $screen_name: event.screen }),
        ...event.properties,
        ...(step && { $session_id: step.session.id }),
        $process_person_profile: false,
      }),
    },
  }
  return { record, state: step ? { ...state, session: step.session } : state }
}
