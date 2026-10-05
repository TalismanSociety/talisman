import { ERROR_CATEGORIES, type ErrorCategory } from "@common/analytics/errorCategory"
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
import type { ExceptionEntry, ExceptionFrame } from "./types"

const L = EXCEPTION_LIMITS

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
  category: z.enum(ERROR_CATEGORIES),
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

const OWN_SCRIPT = /^[\w./-]+\.js$/
const NATIVE_FILENAMES: ReadonlySet<string | undefined> = new Set([
  undefined,
  "<anonymous>",
  "native",
])
const FUNCTION_NAME =
  /^(?:async |new |get |set )?[A-Za-z_$<][\w$.<>]{0,79}(?: \[as [\w$]{1,40}\])?$/
const CHUNK_ID = /^[\w-]+$/

const isCodeName = (name: string | undefined): name is string =>
  name !== undefined && FUNCTION_NAME.test(name) && redactSecrets(name) === name

/**
 * Keeps code positions only. A frame of another origin is dropped whole: the stack parser reads
 * the lines of a multi-line message as frames, so their "filename" can be any text of the message.
 */
export const ownFrames = (frames: readonly RawFrame[], extensionOrigin: string): ExceptionFrame[] =>
  frames.flatMap(({ platform, filename, function: name, lineno, colno, chunk_id }) => {
    const own =
      filename?.startsWith(extensionOrigin) &&
      OWN_SCRIPT.test(filename.slice(extensionOrigin.length))
    if (!own && !NATIVE_FILENAMES.has(filename)) return []
    if (!own && !isCodeName(name)) return []
    return [
      {
        platform,
        ...(own && { filename }),
        ...(isCodeName(name) && { function: name }),
        ...(own && lineno !== undefined && { lineno }),
        ...(own && colno !== undefined && { colno }),
        ...(own && chunk_id !== undefined && CHUNK_ID.test(chunk_id) && { chunk_id }),
        in_app: !!own,
      },
    ]
  })

const ERROR_CLASS = /^[A-Z][A-Za-z0-9]{0,63}$/
const BOUNDARY_PREFIX = "React ErrorBoundary "

/** The name of an error class, never text: a thrown object's own `name` can hold anything. */
export const errorClassOf = ({
  type,
  synthetic,
}: {
  type: string
  synthetic?: boolean
}): string => {
  if (synthetic) return "Error"
  if (type.startsWith(BOUNDARY_PREFIX))
    return `${BOUNDARY_PREFIX}${errorClassOf({ type: type.slice(BOUNDARY_PREFIX.length) })}`
  return ERROR_CLASS.test(type) && redactSecrets(type) === type ? type : "Error"
}

export type ExceptionProperties = {
  readonly $exception_list: readonly ExceptionEntry[]
  readonly $exception_level: "error"
  readonly exception_type: string
  readonly error_category: ErrorCategory
  readonly mechanism: ExceptionMechanism
  readonly handled: boolean
  readonly network_id?: string
}

export type ExceptionResult =
  | { ok: true; event: ParsedException; throttleKey: string; issues?: readonly string[] }
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

  const entries: ExceptionEntry[] = report.exceptions.map(
    ({ stacktrace, mechanism, type }, index) => {
      const frames = stacktrace ? ownFrames(stacktrace.frames, extensionOrigin) : []
      return {
        type: errorClassOf({ type, synthetic: mechanism.synthetic }),
        value: index === 0 ? report.category : "",
        ...(frames.length && { stacktrace: { type: "raw", frames } }),
        mechanism: { ...mechanism, type: index === 0 ? report.mechanism : "chained" },
      }
    }
  )
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
      exception_type: root.type,
      error_category: report.category,
      mechanism: report.mechanism,
      handled: isHandledMechanism(report.mechanism),
    },
  }
  const [thrown] = report.exceptions
  return {
    ok: true,
    event: event as ParsedException,
    throttleKey: `${thrown.type}: ${thrown.value}`,
    ...(screen !== undefined && !screenValid && { issues: ["screen: invalid_format"] }),
  }
}

export const withNetworkId = (event: ParsedException, networkId: string): ParsedException => ({
  ...event,
  properties: { ...event.properties, network_id: networkId },
})

export const EXCEPTION_THROTTLE = {
  windowMs: 10 * 60_000,
  perKey: 3,
  total: 30,
} as const

export type ExceptionThrottle = {
  admit(key: string, now: number): boolean
}

export const createExceptionThrottle = (
  limits: { [K in keyof typeof EXCEPTION_THROTTLE]: number } = EXCEPTION_THROTTLE
): ExceptionThrottle => {
  let windowStart = Number.NEGATIVE_INFINITY
  let admitted = 0
  const counts = new Map<string, number>()
  return {
    admit(key, now) {
      if (now - windowStart >= limits.windowMs) {
        windowStart = now
        admitted = 0
        counts.clear()
      }
      const count = counts.get(key) ?? 0
      if (count >= limits.perKey || admitted >= limits.total) return false
      counts.set(key, count + 1)
      admitted++
      return true
    },
  }
}
