import { catalogue, type EventName, isEventName } from "@common/analytics/catalogue"
import { flowEventRef } from "@common/analytics/flow/registry"
import { properties as catalogueProperties } from "@common/analytics/properties"
import type { ConsentKind, EventProperties } from "@common/analytics/schema"
import { z } from "zod/v4"

import type { ExceptionProperties } from "./exception"
import { redactSecrets } from "./redactSecrets"

type Brand = { readonly __brand: "ParsedEvent" }

export type ParsedCatalogueEvent = {
  readonly name: EventName
  readonly kind: ConsentKind
  readonly properties: EventProperties
  readonly screen?: string
  readonly transactionId?: string
  readonly uuid?: never
} & Brand

export type ParsedException = {
  readonly name: "$exception"
  readonly kind: "error"
  readonly properties: ExceptionProperties
  readonly screen?: string
  readonly transactionId?: never
  readonly uuid: string
} & Brand

export type ParsedEvent = ParsedCatalogueEvent | ParsedException

export type ParseFailure = {
  ok: false
  name: string
  issues: readonly string[]
  disposition: "rejected" | "filtered"
}

export type ParseResult<E extends ParsedEvent = ParsedEvent> =
  | { ok: true; event: E; issues?: readonly string[] }
  | ParseFailure

const envelopeSchema = z.strictObject({
  event: z.string().max(64),
  properties: z.record(z.string(), z.unknown()),
  screen: z.string().optional(),
  transactionId: z.string().max(128).optional(),
})

export const describeIssues = (error: z.ZodError) =>
  error.issues.map((issue) => {
    const where = issue.path.join(".") || "(root)"
    const keys = issue.code === "unrecognized_keys" ? ` ${redactSecrets(issue.keys.join(","))}` : ""
    return `${where}: ${issue.code}${keys}`
  })

export const rejected = (name: string, issues: readonly string[]): ParseFailure => ({
  ok: false,
  name,
  issues,
  disposition: "rejected",
})

const linksTransaction = (name: EventName) => {
  const ref = flowEventRef(name)
  return ref?.lifecycle === "submitted" && ref.flow.settlement === "transaction"
}

export const parseTrackedEvent = (raw: unknown): ParseResult<ParsedCatalogueEvent> => {
  const envelope = envelopeSchema.safeParse(raw)
  if (!envelope.success) return rejected("", describeIssues(envelope.error))

  const { event: name, properties, screen, transactionId } = envelope.data
  if (!isEventName(name)) return rejected(redactSecrets(name), ["unknown_event"])
  if (transactionId !== undefined && !linksTransaction(name))
    return rejected(name, ["transaction_id_not_allowed"])

  const def = catalogue[name]
  const parsed = def.schema.safeParse(properties)
  if (!parsed.success) return rejected(name, describeIssues(parsed.error))

  const screenValid =
    screen !== undefined && catalogueProperties.$screen_name.schema.safeParse(screen).success
  const event: Omit<ParsedCatalogueEvent, "__brand"> = {
    name,
    kind: def.kind,
    properties: parsed.data,
    ...(screenValid && { screen }),
    ...(transactionId !== undefined && { transactionId }),
  }
  return {
    ok: true,
    event: event as ParsedCatalogueEvent,
    ...(screen !== undefined && !screenValid && { issues: ["screen: invalid_format"] }),
  }
}
