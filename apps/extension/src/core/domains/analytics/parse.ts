import { catalogue, type EventName } from "@common/analytics/catalogue"
import { properties as catalogueProperties } from "@common/analytics/properties"
import type { ConsentKind, EventProperties } from "@common/analytics/schema"
import { z } from "zod/v4"

import { redactSecrets } from "./redactSecrets"

export type ParsedEvent = {
  readonly name: EventName
  readonly kind: ConsentKind
  readonly properties: EventProperties
  /** The page's screen when the event fired, valid as a `$screen_name`. */
  readonly screen?: string
} & { readonly __brand: "ParsedEvent" }

export type ParseResult =
  | { ok: true; event: ParsedEvent; issues?: readonly string[] }
  | { ok: false; name: string; issues: readonly string[] }

const envelopeSchema = z.strictObject({
  event: z.string().max(64),
  properties: z.record(z.string(), z.unknown()),
  screen: z.string().optional(),
})

const describeIssues = (error: z.ZodError) =>
  error.issues.map((issue) => {
    const where = issue.path.join(".") || "(root)"
    const keys = issue.code === "unrecognized_keys" ? ` ${redactSecrets(issue.keys.join(","))}` : ""
    return `${where}: ${issue.code}${keys}`
  })

const isEventName = (name: string): name is EventName => Object.hasOwn(catalogue, name)

export const parseTrackedEvent = (raw: unknown): ParseResult => {
  const envelope = envelopeSchema.safeParse(raw)
  if (!envelope.success) return { ok: false, name: "", issues: describeIssues(envelope.error) }

  const { event: name, properties, screen } = envelope.data
  if (!isEventName(name)) return { ok: false, name: redactSecrets(name), issues: ["unknown_event"] }

  const def = catalogue[name]
  const parsed = def.schema.safeParse(properties)
  if (!parsed.success) return { ok: false, name, issues: describeIssues(parsed.error) }

  const screenValid =
    screen !== undefined && catalogueProperties.$screen_name.schema.safeParse(screen).success
  const event: Omit<ParsedEvent, "__brand"> = {
    name,
    kind: def.kind,
    properties: parsed.data,
    ...(screenValid && { screen }),
  }
  return {
    ok: true,
    event: event as ParsedEvent,
    ...(screen !== undefined && !screenValid && { issues: ["screen: invalid_format"] }),
  }
}
