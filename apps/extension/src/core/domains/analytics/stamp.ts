import type { ConsentKind } from "@common/analytics/schema"
import type { UiContext } from "@common/analytics/superProperties"

import type { Environment } from "./environment"
import type { ParsedEvent } from "./parse"
import { redactSecrets } from "./redactSecrets"
import { advanceSession, realTime, shift, uuidv7 } from "./session"
import type {
  AnalyticsSession,
  AnalyticsState,
  ExceptionEntry,
  QueuedEventRecord,
  RedactedProperties,
  WireProperties,
  WireTime,
} from "./types"

export const KIND_POLICY = {
  usage: { flushImmediately: false },
  error: { flushImmediately: true },
} as const satisfies Record<ConsentKind, { readonly flushImmediately: boolean }>

const redactValue = (value: WireProperties[string]): WireProperties[string] => {
  if (typeof value === "string") return redactSecrets(value)
  if (typeof value !== "object" || value === null) return value
  return value.map((item) =>
    typeof item === "string" ? redactSecrets(item) : item
  ) as typeof value
}

/** Frames hold code positions only (ownFrames), and a Chrome extension id is valid base58: redacting them would break symbolication. */
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

const placeInTime = (
  event: ParsedEvent,
  current: AnalyticsSession | null,
  realNow: number,
  drawOffset: () => number
): { at: WireTime; session: AnalyticsSession | null } => {
  if (event.kind === "error") return { at: realTime(realNow), session: null }
  if (event.unlinked) return { at: shift(realNow, drawOffset()), session: null }
  return advanceSession(current, realNow, drawOffset)
}

const environmentOf = (event: ParsedEvent, environment: Environment) => {
  if (event.kind !== "error" && !event.unlinked) return environment
  const { browser_language: _, ...shared } = environment
  return shared
}

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
  const { at, session } = placeInTime(event, state.session, realNow, drawOffset)
  const uuid = event.uuid ?? uuidv7(at)
  const record: QueuedEventRecord = {
    uuid,
    sendAt: at,
    kind: event.kind,
    wire: {
      event: event.name,
      distinct_id: session?.id ?? uuid,
      timestamp: new Date(at).toISOString(),
      uuid,
      properties: redactProperties({
        ...environmentOf(event, environment),
        ui_context: uiContext,
        ...(event.screen && { $screen_name: event.screen }),
        ...event.properties,
        ...(session && { $session_id: session.id }),
        $process_person_profile: false,
      }),
    },
  }
  return { record, state: session ? { ...state, session } : state }
}
