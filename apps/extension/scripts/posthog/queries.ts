export type PropertyFilter = {
  readonly key: string
  readonly type: "event"
  readonly operator: string
  readonly value?: readonly (string | number | boolean)[]
}

export const TEST_ACCOUNT_FILTERS: readonly PropertyFilter[] = [
  {
    key: "appVariant",
    type: "event",
    operator: "is_not",
    value: ["development", "preview", "canary"],
  },
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

type Math = "total" | "dau" | "avg" | "median" | "p90" | "p95" | "sum"

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
  readonly optional?: boolean
}

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

/** Unique sessions: a usage event's distinct_id is its session, and PostHog's "unique users" counts distinct ids. */
export const sessions = (event: string | null, opts: Omit<EvOptions, "math"> = {}) =>
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
