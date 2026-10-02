import {
  EXCEPTION_LIMITS,
  EXCEPTION_MECHANISMS,
  type ExceptionMechanism,
  isHandledMechanism,
} from "@common/analytics/exceptionReport"
import { properties as catalogueProperties } from "@common/analytics/properties"
import { z } from "zod/v4"

import { describeIssues, type ParsedException, type ParseFailure, rejected } from "./parse"
import { redactSecrets } from "./redactSecrets"
import { scrubExceptionMessage } from "./scrubExceptionMessage"
import type { ExceptionEntry, ExceptionFrame } from "./types"

const L = EXCEPTION_LIMITS

/** Unknown keys (vars, context_line, module, a page's in_app) are stripped, never forwarded. */
const frameSchema = z.object({
  platform: z.literal("web:javascript"),
  filename: z.string().max(L.filenameLength).optional(),
  function: z.string().max(L.functionLength).optional(),
  lineno: z.int().nonnegative().optional(),
  colno: z.int().nonnegative().optional(),
  chunk_id: z.string().max(L.chunkIdLength).optional(),
})

type RawFrame = z.infer<typeof frameSchema>

const entrySchema = z.object({
  type: z.string().max(L.typeLength).default("Error"),
  value: z.string().max(L.rawValueLength).default(""),
  stacktrace: z
    .object({ type: z.literal("raw"), frames: z.array(frameSchema).max(L.framesPerEntry) })
    .optional(),
  mechanism: z.object({
    type: z.string().max(32),
    handled: z.boolean().optional(),
    synthetic: z.boolean().optional(),
    exception_id: z.int().nonnegative(),
    parent_id: z.int().nonnegative().optional(),
    source: z.enum(["cause", "member"]).optional(),
  }),
})

const exceptionReportSchema = z.strictObject({
  id: z.uuid(),
  mechanism: z.enum(EXCEPTION_MECHANISMS),
  exceptions: z.array(entrySchema).min(1).max(L.entries),
  networkId: z.string().max(L.networkIdLength).optional(),
  screen: z.string().max(L.screenLength).optional(),
})

export type ParsedExceptionReport = z.infer<typeof exceptionReportSchema>

export const parseExceptionReport = (
  raw: unknown
): { ok: true; report: ParsedExceptionReport } | ParseFailure => {
  const parsed = exceptionReportSchema.safeParse(raw)
  return parsed.success
    ? { ok: true, report: parsed.data }
    : rejected("$exception", describeIssues(parsed.error))
}

/** Sentry's ignoreErrors, matched on the raw root message and on `type: message`. */
export const IGNORED_ERRORS = {
  window_closed: /No window with id: \d+/,
  ws_normal_closure: /disconnected from wss[(]?:\/\/[\w./:-]+: \d+:: Normal Closure[)]?/,
  ws_disconnected: /^disconnected from .+: \d+:: .+$/,
  ws_unsubscribed: /^unsubscribed from .+: \d+:: .+$/,
  no_receiving_end: /Could not establish connection\. Receiving end does not exist\./,
  media_track_capabilities: /track\.getCapabilities is not a function/,
} as const satisfies Record<string, RegExp>

export type IgnoredError = keyof typeof IGNORED_ERRORS

export const ignoredBy = ({ type, value }: { type: string; value: string }): IgnoredError | null =>
  (Object.keys(IGNORED_ERRORS) as IgnoredError[]).find(
    (key) => IGNORED_ERRORS[key].test(value) || IGNORED_ERRORS[key].test(`${type}: ${value}`)
  ) ?? null

const MOZ_EXTENSION_ORIGIN = /^moz-extension:\/\/[^/]+\//

/**
 * PostHog recomputes in_app for every frame it resolves, so this decides only the frames it cannot.
 * A Firefox origin holds a per-install UUID; it is replaced after the realm applied chunk ids,
 * which are keyed by the raw filename.
 */
export const markFrames = (
  frames: readonly RawFrame[],
  extensionOrigin: string
): ExceptionFrame[] =>
  frames.map(({ filename, ...frame }) => ({
    ...frame,
    ...(filename !== undefined && {
      filename: filename.replace(MOZ_EXTENSION_ORIGIN, "moz-extension://talisman/"),
    }),
    in_app: filename?.startsWith(extensionOrigin) ?? false,
  }))

export type ExceptionProperties = {
  readonly $exception_list: readonly ExceptionEntry[]
  readonly $exception_level: "error"
  /** PostHog groups on every frame otherwise: one bug would split by library call path. */
  readonly $exception_fingerprint: string
  readonly exception_type: string
  readonly mechanism: ExceptionMechanism
  readonly handled: boolean
  readonly network_id?: string
}

export type ExceptionResult =
  | { ok: true; event: ParsedException; issues?: readonly string[] }
  | ParseFailure

export const toExceptionEvent = (
  report: ParsedExceptionReport,
  { extensionOrigin }: { extensionOrigin: string }
): ExceptionResult => {
  const ignored = ignoredBy(report.exceptions[0])
  if (ignored)
    return {
      ok: false,
      name: "$exception",
      issues: [`ignored:${ignored}`],
      disposition: "filtered",
    }

  const entries: ExceptionEntry[] = report.exceptions.map(({ stacktrace, ...entry }) => ({
    ...entry,
    type: redactSecrets(entry.type),
    value: scrubExceptionMessage(entry.value),
    ...(stacktrace && {
      stacktrace: { type: "raw", frames: markFrames(stacktrace.frames, extensionOrigin) },
    }),
  }))
  const [root] = entries
  const { screen } = report
  const screenValid =
    screen !== undefined && catalogueProperties.$screen_name.schema.safeParse(screen).success
  const event: Omit<ParsedException, "__brand"> = {
    name: "$exception",
    kind: "error",
    uuid: report.id,
    ...(screenValid && { screen }),
    properties: {
      $exception_list: entries,
      $exception_level: "error",
      $exception_fingerprint: `${root.type}: ${root.value}`,
      exception_type: root.type,
      mechanism: report.mechanism,
      handled: isHandledMechanism(report.mechanism),
    },
  }
  return {
    ok: true,
    event: event as ParsedException,
    ...(screen !== undefined && !screenValid && { issues: ["screen: invalid_format"] }),
  }
}

export const withNetworkId = (event: ParsedException, networkId: string): ParsedException => ({
  ...event,
  properties: { ...event.properties, network_id: networkId },
})

export const EXCEPTION_THROTTLE = {
  windowMs: 10 * 60_000,
  perFingerprint: 3,
  total: 30,
} as const

export type ExceptionThrottle = {
  /** Only admitted occurrences count, so one looping error cannot use up the window. */
  admit(fingerprint: string, now: number): boolean
}

/** A fixed window per worker lifetime. The map holds admitted fingerprints only: at most `total`. */
export const createExceptionThrottle = (
  limits: { [K in keyof typeof EXCEPTION_THROTTLE]: number } = EXCEPTION_THROTTLE
): ExceptionThrottle => {
  let windowStart = Number.NEGATIVE_INFINITY
  let admitted = 0
  const counts = new Map<string, number>()
  return {
    admit(fingerprint, now) {
      if (now - windowStart >= limits.windowMs) {
        windowStart = now
        admitted = 0
        counts.clear()
      }
      const count = counts.get(fingerprint) ?? 0
      if (count >= limits.perFingerprint || admitted >= limits.total) return false
      counts.set(fingerprint, count + 1)
      admitted++
      return true
    },
  }
}
