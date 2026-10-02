export type PropertyFilter = {
  readonly key: string
  readonly type: "event"
  readonly operator: string
  readonly value?: readonly (string | number | boolean)[]
}

/** The filter lists what to keep, so `is_not`. */
export const TEST_ACCOUNT_FILTERS: readonly PropertyFilter[] = [
  { key: "appVariant", type: "event", operator: "is_not", value: ["development", "preview"] },
]

export const DEFAULT_DATE_FROM = "-30d"

type JsonObject = { readonly [key: string]: unknown }
export type Source = JsonObject & { readonly kind: string }
export type VizQuery = { readonly kind: "InsightVizNode"; readonly source: Source }
export type SqlQuery = JsonObject & {
  readonly kind: "DataVisualizationNode"
  readonly source: Source & { readonly kind: "HogQLQuery"; readonly query: string }
}
export type Query = VizQuery | SqlQuery

type Math =
  | "total"
  | "dau"
  | "weekly_active"
  | "monthly_active"
  | "avg"
  | "median"
  | "p90"
  | "p95"
  | "sum"

export type EventsNode = {
  readonly kind: "EventsNode"
  readonly event: string | null
  readonly name: string
  readonly math?: Math
  readonly math_property?: string
  readonly math_property_type?: "event_properties"
  readonly custom_name?: string
  readonly properties?: readonly PropertyFilter[]
  readonly optionalInFunnel?: boolean
}

const dateRange = (dateFrom = DEFAULT_DATE_FROM) => ({ date_from: dateFrom, date_to: null })

export const prop = (
  key: string,
  value: string | number | boolean | readonly (string | number | boolean)[],
  operator = "exact"
): PropertyFilter => ({
  key,
  type: "event",
  operator,
  value: Array.isArray(value) ? value : [value as string | number | boolean],
})

type EvOptions = {
  readonly math?: Math
  readonly mathProperty?: string
  readonly name?: string
  readonly properties?: readonly PropertyFilter[]
  /** A funnel step the conversion does not require. */
  readonly optional?: boolean
}

/** `null` is every event. */
export const ev = (event: string | null, opts: EvOptions = {}): EventsNode => ({
  kind: "EventsNode",
  event,
  name: event ?? "All events",
  math: opts.math ?? "total",
  ...(opts.mathProperty && {
    math_property: opts.mathProperty,
    math_property_type: "event_properties" as const,
  }),
  ...(opts.name && { custom_name: opts.name }),
  ...(opts.properties?.length && { properties: opts.properties }),
  ...(opts.optional && { optionalInFunnel: true }),
})

/** Unique installs: events are personless, so PostHog counts a deterministic id per distinct_id. */
export const users = (event: string | null, opts: Omit<EvOptions, "math"> = {}) =>
  ev(event, { ...opts, math: "dau" })

const breakdownFilter = (breakdown: string | readonly string[], limit?: number) => ({
  breakdowns: (typeof breakdown === "string" ? [breakdown] : breakdown).map((property) => ({
    property,
    type: "event",
  })),
  ...(limit && { breakdown_limit: limit }),
})

const viz = (source: Source): VizQuery => ({ kind: "InsightVizNode", source })

type TrendOptions = {
  readonly series: readonly EventsNode[]
  readonly display?: string
  readonly breakdown?: string | readonly string[]
  readonly breakdownLimit?: number
  readonly formula?: string
  readonly interval?: "hour" | "day" | "week" | "month"
  readonly compare?: boolean
}

export const trend = (o: TrendOptions): VizQuery =>
  viz({
    kind: "TrendsQuery",
    dateRange: dateRange(),
    interval: o.interval ?? "day",
    series: o.series,
    properties: [],
    filterTestAccounts: true,
    trendsFilter: {
      display: o.display ?? "ActionsLineGraph",
      ...(o.formula && { formulaNodes: [{ formula: o.formula }] }),
    },
    ...(o.compare && { compareFilter: { compare: true } }),
    ...(o.breakdown && { breakdownFilter: breakdownFilter(o.breakdown, o.breakdownLimit) }),
  })

type FunnelOptions = {
  readonly steps: readonly EventsNode[]
  readonly window?: number
  readonly windowUnit?: "minute" | "hour" | "day"
  readonly breakdown?: string
}

export const funnel = (o: FunnelOptions): VizQuery =>
  viz({
    kind: "FunnelsQuery",
    dateRange: dateRange(),
    series: o.steps,
    properties: [],
    filterTestAccounts: true,
    funnelsFilter: {
      funnelVizType: "steps",
      funnelOrderType: "ordered",
      funnelWindowInterval: o.window ?? 1,
      funnelWindowIntervalUnit: o.windowUnit ?? "day",
      funnelStepReference: "total",
      layout: "vertical",
    },
    ...(o.breakdown && { breakdownFilter: breakdownFilter(o.breakdown) }),
  })

export const retention = (o: {
  readonly target: string
  readonly returning: string
  readonly period?: "Day" | "Week"
  readonly totalIntervals?: number
  readonly dateFrom?: string
}): VizQuery => {
  const entity = (event: string) => ({ id: event, name: event, type: "events", kind: "EventsNode" })
  return viz({
    kind: "RetentionQuery",
    dateRange: dateRange(o.dateFrom),
    properties: [],
    filterTestAccounts: true,
    retentionFilter: {
      targetEntity: entity(o.target),
      returningEntity: entity(o.returning),
      period: o.period ?? "Week",
      totalIntervals: o.totalIntervals ?? 8,
      retentionType: "retention_first_time",
      retentionReference: "total",
      meanRetentionCalculation: "weighted",
    },
  })
}

export const stickiness = (o: { readonly series: readonly EventsNode[] }): VizQuery =>
  viz({
    kind: "StickinessQuery",
    dateRange: dateRange(),
    interval: "day",
    series: o.series,
    properties: [],
    filterTestAccounts: true,
    stickinessFilter: {},
  })

export const paths = (o: { readonly startPoint?: string; readonly stepLimit?: number }): VizQuery =>
  viz({
    kind: "PathsQuery",
    dateRange: dateRange(),
    properties: [],
    filterTestAccounts: true,
    pathsFilter: {
      includeEventTypes: ["$screen"],
      stepLimit: o.stepLimit ?? 5,
      ...(o.startPoint && { startPoint: o.startPoint }),
    },
  })

type HogqlOptions = {
  readonly dateFrom?: string
  readonly display?: string
  readonly x?: string
  readonly y?: readonly string[]
}

/** PostHog expands `{filters}` to the date range and the test-account filter. */
export const hogql = (sql: string, opts: HogqlOptions = {}): SqlQuery => {
  if (!sql.includes("{filters}")) throw new Error(`SQL without {filters}:\n${sql}`)
  const source = {
    kind: "HogQLQuery" as const,
    query: sql.trim(),
    filters: { dateRange: dateRange(opts.dateFrom), filterTestAccounts: true },
  }
  if (!opts.display) return { kind: "DataVisualizationNode", source, display: "ActionsTable" }
  return {
    kind: "DataVisualizationNode",
    source,
    display: opts.display,
    chartSettings: {
      ...(opts.x && { xAxis: { column: opts.x } }),
      yAxis: (opts.y ?? []).map((column) => ({ column, settings: { formatting: {} } })),
    },
  }
}

export const withTestAccountFilter = (query: Query, enabled: boolean): Query =>
  query.kind === "InsightVizNode"
    ? { ...query, source: { ...query.source, filterTestAccounts: enabled } }
    : {
        ...query,
        source: {
          ...query.source,
          filters: { ...(query.source.filters as JsonObject), filterTestAccounts: enabled },
        },
      }

export const sqlString = (value: string) =>
  `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`
export const sqlList = (values: readonly string[]) => values.map(sqlString).join(", ")

/** The test-account filter as SQL, for a scan that must not take `{filters}`'s date range. */
export const SQL_NOT_TEST_ACCOUNT = TEST_ACCOUNT_FILTERS.map(
  ({ key, value }) => `ifNull(properties.${key}, '') NOT IN (${sqlList((value ?? []).map(String))})`
).join(" AND ")
