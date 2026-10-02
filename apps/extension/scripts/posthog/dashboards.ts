import type { EventDefinition, PropertyDefinition } from "@common/analytics/catalogue"
import { EXCEPTION_MECHANISMS } from "@common/analytics/exceptionReport"
import type { ExceptionProperties } from "@core/domains/analytics/exception"

import { type Flow, flowAbandonment, flowEventColumns, flowFunnel, successFilter } from "./flows"
import {
  type EventsNode,
  ev,
  hogql,
  paths,
  prop,
  type Query,
  retention,
  SQL_NOT_TEST_ACCOUNT,
  sqlList,
  stickiness,
  trend,
  users,
  withTestAccountFilter,
} from "./queries"

export type CatalogueSnapshot = {
  readonly events: readonly EventDefinition[]
  readonly properties: readonly PropertyDefinition[]
  readonly flows: readonly Flow[]
}

export type Tile = {
  readonly name: string
  readonly description: string
  readonly query: Query
  readonly size?: "third" | "half" | "full"
}

export type Dashboard = {
  readonly slug: string
  readonly prefix: string
  readonly title: string
  readonly description: string
  readonly tiles: readonly Tile[]
  /** Pre-release installs are the test accounts, so its tiles never apply the test-account filter. */
  readonly audience?: "pre-release"
}

const PRE_RELEASE_VARIANTS = sqlList(["preview", "canary"])

export const tileQuery = (spec: Dashboard, tile: Tile, filterTestAccounts: boolean): Query =>
  withTestAccountFilter(tile.query, spec.audience !== "pre-release" && filterTestAccounts)

export type Alert = {
  readonly name: string
  readonly tile: string
  /** On a tile with a formula, 0 is the formula's result. */
  readonly seriesIndex: number
  readonly condition: "absolute_value" | "relative_increase" | "relative_decrease"
  /** A percentage is a fraction: 1 is 100%. */
  readonly threshold: {
    readonly type: "absolute" | "percentage"
    readonly lower?: number
    readonly upper?: number
  }
  readonly interval: "hourly" | "daily" | "weekly"
}

type ExceptionPropertyName = Exclude<keyof ExceptionProperties, `$${string}` | "network_id">

const exceptionProperties: {
  readonly [K in ExceptionPropertyName]: Omit<PropertyDefinition, "name" | "isSuper">
} = {
  exception_type: {
    description: "The thrown value's type, such as TypeError: the first entry of $exception_list.",
    posthogType: "String",
  },
  mechanism: {
    description:
      "How the error reached the reporter. caught: a call site reported it. uncaught and unhandled_rejection: the global handlers. error_boundary: a React error boundary.",
    posthogType: "String",
    values: EXCEPTION_MECHANISMS,
  },
  handled: {
    description:
      "The app recovered: a call site caught it or an error boundary showed the error screen. False for uncaught errors and unhandled rejections.",
    posthogType: "Boolean",
  },
}

export const EXCEPTION_PROPERTIES: readonly PropertyDefinition[] = Object.entries(
  exceptionProperties
).map(([name, definition]) => ({ name, ...definition, isSuper: false }))

export const BUILTIN_EVENTS: Readonly<Record<string, readonly string[]>> = {
  $exception: [...Object.keys(exceptionProperties), "network_id"],
}

export const catalogueSnapshot = (
  definitions: Omit<CatalogueSnapshot, "flows">,
  flows: readonly Flow[]
): CatalogueSnapshot => ({
  events: definitions.events,
  properties: [...definitions.properties, ...EXCEPTION_PROPERTIES],
  flows,
})

export const UNLOCK_FAILED_EVENT = "app_unlock_failed"

const MIN_SCREEN_VIEWS = 10

const flowTiles = (flows: readonly Flow[]) => {
  if (!flows.length) return { funnels: [], abandonment: [] }
  const columns = flowEventColumns(flows)
  const flowEvents = `
  SELECT
    ${columns.select},
    distinct_id,
    $session_id AS session,
    toFloat(properties.duration_ms) AS duration,
    properties.error_category AS error_category,
    properties.abandon_cause AS abandon_cause
  FROM events
  WHERE ${columns.where} AND {filters}`

  const funnels: Tile[] = [
    {
      name: "Flow scoreboard",
      description:
        "One row per flow: attempts (flow_id), the share completed (a transaction flow counts status success only, a swap swap_status finished only), abandoned, with a failure, and p50/p90 milliseconds from started to completed (client-measured).",
      size: "full",
      query: hogql(`
SELECT
  flow,
  uniqIf(attempt, lifecycle = 'started') AS attempts,
  uniqIf(attempt, lifecycle = 'completed' AND succeeded) AS completed,
  round(100 * completed / nullIf(attempts, 0), 1) AS completed_pct,
  uniqIf(attempt, lifecycle = 'abandoned') AS abandoned,
  uniqIf(attempt, lifecycle = 'failed') AS with_failure,
  round(quantile(0.5)(if(lifecycle = 'completed', duration, NULL))) AS p50_ms,
  round(quantile(0.9)(if(lifecycle = 'completed', duration, NULL))) AS p90_ms
FROM (${flowEvents}
)
GROUP BY flow
ORDER BY attempts DESC`),
    },
    ...flows.map((flow) => {
      const success = successFilter(flow)
      return {
        name: `Funnel: ${flow.name}`,
        description: `Installs that started ${flow.subject} and completed it within a day, through the steps in order. Steps are optional, as a branch skips some. The steps view shows drop-off and the time between steps.${success ? ` completed counts ${success.key} ${success.value?.join(" or ")} only.` : ""}`,
        query: flowFunnel(flow),
      }
    }),
  ]

  const abandonment: Tile[] = [
    {
      name: "Last step before abandonment",
      description:
        "Abandoned attempts by flow and the step they were on, with how they ended (left inside the page or page closed) and how many had shown an error first.",
      size: "full",
      query: hogql(`
SELECT
  flow,
  ifNull(last_step, '(before the first step)') AS step,
  count() AS abandoned,
  countIf(abandon_cause = 'page_closed') AS page_closed,
  countIf(error_category IS NOT NULL) AS after_error,
  uniq(distinct_id) AS installs
FROM (${flowEvents}
)
WHERE lifecycle = 'abandoned'
GROUP BY flow, step
ORDER BY abandoned DESC
LIMIT 100`),
    },
    {
      name: "Flows retried within a session",
      description:
        "Per flow: sessions where it started, sessions where it started more than once (a new flow_id), and sessions with a failed attempt (retried under the same flow_id).",
      size: "full",
      query: hogql(`
SELECT
  flow,
  count() AS sessions,
  countIf(attempts > 1) AS restarted,
  round(100 * restarted / sessions, 1) AS restarted_pct,
  countIf(failures > 0) AS with_failure
FROM (
  SELECT flow, session, uniqIf(attempt, lifecycle = 'started') AS attempts, countIf(lifecycle = 'failed') AS failures
  FROM (${flowEvents}
  )
  WHERE session != ''
  GROUP BY flow, session
)
WHERE attempts > 0
GROUP BY flow
ORDER BY restarted DESC`),
    },
    ...flows.map((flow) => ({
      name: `Abandoned: ${flow.name}`,
      description: `Abandoned attempts at ${flow.subject}, by ${flow.abandonedStepProperty}: the step the user left on.`,
      query: flowAbandonment(flow),
    })),
  ]
  return { funnels, abandonment }
}

export const buildDashboards = (catalogue: CatalogueSnapshot): Dashboard[] => {
  const { funnels, abandonment } = flowTiles(catalogue.flows)
  return [
    {
      slug: "overview",
      prefix: "Overview",
      title: "Overview & Health",
      description:
        "Active installs, retention, speed and errors for the Talisman extension. All counts are anonymous, per install. Production builds only.",
      tiles: [
        {
          name: "Active installs",
          description:
            "Installs that sent any event over the date range, with the change from the previous period.",
          size: "third",
          query: trend({
            series: [users(null, { name: "Active installs" })],
            display: "BoldNumber",
            compare: true,
          }),
        },
        {
          name: "DAU / WAU / MAU",
          description: "Installs that sent any event: daily, rolling 7-day and rolling 30-day.",
          size: "full",
          query: trend({
            series: [
              users(null, { name: "DAU" }),
              ev(null, { math: "weekly_active", name: "WAU" }),
              ev(null, { math: "monthly_active", name: "MAU" }),
            ],
          }),
        },
        {
          name: "Weekly retention",
          description:
            "Of the installs that first showed a wallet screen in a week, the share that showed one again in each later week.",
          query: retention({
            target: "$screen",
            returning: "$screen",
            period: "Week",
            totalIntervals: 8,
            dateFrom: "-60d",
          }),
        },
        {
          name: "Stickiness",
          description: "How many days in the period each install showed a wallet screen.",
          query: stickiness({ series: [ev("$screen")] }),
        },
        {
          name: "Install lifecycle",
          description:
            "Weekly active installs: new (first seen that week, over the last 365 days), returning (also active the week before) and resurrecting (back after a gap). Built in SQL because personless events leave PostHog's lifecycle insight empty.",
          size: "full",
          query: hogql(
            `
SELECT
  week,
  countIf(week = first_week) AS new,
  countIf(week > first_week AND has(weeks, week - toIntervalWeek(1))) AS returning,
  countIf(week > first_week AND NOT has(weeks, week - toIntervalWeek(1))) AS resurrecting
FROM (
  SELECT distinct_id, groupUniqArray(toStartOfWeek(timestamp)) AS weeks, min(toStartOfWeek(timestamp)) AS first_week
  FROM events
  WHERE ${SQL_NOT_TEST_ACCOUNT} AND timestamp > now() - toIntervalDay(365)
  GROUP BY distinct_id
)
ARRAY JOIN weeks AS week
WHERE week IN (SELECT DISTINCT toStartOfWeek(timestamp) FROM events WHERE {filters})
GROUP BY week
ORDER BY week`,
            {
              dateFrom: "-90d",
              display: "ActionsStackedBar",
              x: "week",
              y: ["new", "returning", "resurrecting"],
            }
          ),
        },
        {
          name: "Popup open time",
          description:
            "Milliseconds from a popup page starting to load to its first screen painted: median and p90.",
          query: trend({
            series: [
              ev("popup_opened", {
                math: "median",
                mathProperty: "time_to_interactive_ms",
                name: "p50",
              }),
              ev("popup_opened", {
                math: "p90",
                mathProperty: "time_to_interactive_ms",
                name: "p90",
              }),
            ],
          }),
        },
        {
          name: "Balances load time",
          description:
            "Milliseconds from the unlock (or page load when already unlocked) to balances loaded: median and p90.",
          query: trend({
            series: [
              ev("balances_loaded", { math: "median", mathProperty: "duration_ms", name: "p50" }),
              ev("balances_loaded", { math: "p90", mathProperty: "duration_ms", name: "p90" }),
            ],
          }),
        },
        {
          name: "Exceptions",
          description: "Exceptions reported, and installs that reported one.",
          query: trend({
            series: [
              ev("$exception", { name: "Exceptions" }),
              users("$exception", { name: "Installs with an exception" }),
            ],
          }),
        },
        {
          name: "Unlock failure rate",
          description:
            "Failed unlock attempts as a share of attempts (failed plus successful unlocks).",
          query: trend({
            series: [
              ev(UNLOCK_FAILED_EVENT, { name: "Failed" }),
              ev("app_unlocked", { name: "Unlocked" }),
            ],
            formula: "A / (A + B)",
          }),
        },
        {
          name: "Active installs by version",
          description: "Daily active installs by extension version: how fast a release is adopted.",
          size: "full",
          query: trend({
            series: [users(null, { name: "Installs" })],
            breakdown: "appVersion",
            breakdownLimit: 10,
            display: "ActionsAreaGraph",
          }),
        },
      ],
    },
    {
      slug: "flow-funnels",
      prefix: "Funnels",
      title: "Flow funnels",
      description:
        "Drop-off per step and time to convert, one funnel per flow in the analytics registry (generated). The scoreboard compares every flow.",
      tiles: funnels,
    },
    {
      slug: "flow-abandonment",
      prefix: "Abandonment",
      title: "Flow abandonment",
      description:
        "Where users give up on a flow, and the flows they restart or retry (generated from the analytics registry).",
      tiles: abandonment,
    },
    {
      slug: "errors",
      prefix: "Errors",
      title: "Errors users see",
      description:
        "Errors shown to users (toasts, field errors, alerts, error screens), by flow, field and screen. Never their text.",
      tiles: [
        {
          name: "Errors shown by flow and field",
          description:
            "The most frequent errors shown: the flow running, the form field, where it showed and its category.",
          size: "full",
          query: hogql(`
SELECT
  ifNull(properties.flow, '(no flow)') AS flow,
  ifNull(properties.field, '') AS field,
  properties.surface AS surface,
  properties.error_category AS category,
  count() AS shown,
  uniq(distinct_id) AS installs
FROM events
WHERE event = 'error_shown' AND {filters}
GROUP BY flow, field, surface, category
ORDER BY shown DESC
LIMIT 100`),
        },
        {
          name: "Errors shown by category",
          description: "Installs that saw an error, by error category.",
          query: trend({
            series: [users("error_shown", { name: "Installs" })],
            breakdown: "error_category",
            display: "ActionsStackedBar",
          }),
        },
        {
          name: "Errors shown by screen",
          description: "Errors shown per screen (route pattern) and category.",
          query: hogql(`
SELECT properties.$screen_name AS screen, properties.error_category AS category, count() AS shown, uniq(distinct_id) AS installs
FROM events
WHERE event = 'error_shown' AND {filters}
GROUP BY screen, category
ORDER BY shown DESC
LIMIT 50`),
        },
      ],
    },
    {
      slug: "exceptions",
      prefix: "Exceptions",
      title: "Exceptions",
      description:
        "Exceptions the wallet reported, by type, mechanism and network. Exceptions carry a separate error-only install id, so they cannot be joined to product events.",
      tiles: [
        {
          name: "Top exceptions",
          description:
            "The most frequent exceptions, one row per fingerprint (type and scrubbed message; stored as its SHA-512 hex when longer than 128 characters): how it was caught, whether the app recovered, the installs that reported it and the screens it showed on.",
          size: "full",
          query: hogql(`
SELECT
  properties.exception_type AS type,
  properties.$exception_fingerprint AS fingerprint,
  properties.mechanism AS mechanism,
  properties.handled AS handled,
  count() AS reported,
  uniq(distinct_id) AS installs,
  topK(3)(properties.$screen_name) AS screens,
  max(timestamp) AS last_seen
FROM events
WHERE event = '$exception' AND {filters}
GROUP BY type, fingerprint, mechanism, handled
ORDER BY reported DESC
LIMIT 100`),
        },
        {
          name: "Exceptions by type",
          description: "Exceptions reported, by the thrown value's type.",
          query: trend({
            series: [ev("$exception", { name: "Exceptions" })],
            breakdown: "exception_type",
            breakdownLimit: 10,
            display: "ActionsStackedBar",
          }),
        },
        {
          name: "Exceptions by mechanism",
          description:
            "Exceptions reported, by how they reached the reporter: caught by a call site or an error boundary (handled), or uncaught and unhandled rejections.",
          query: trend({
            series: [ev("$exception", { name: "Exceptions" })],
            breakdown: "mechanism",
            display: "ActionsStackedBar",
          }),
        },
        {
          name: "Exceptions by network",
          description:
            "Exceptions reported while talking to a network, by network id (custom for a user-added network).",
          query: trend({
            series: [ev("$exception", { name: "Exceptions" })],
            breakdown: "network_id",
            breakdownLimit: 10,
            display: "ActionsStackedBar",
          }),
        },
      ],
    },
    {
      slug: "navigation",
      prefix: "Navigation",
      title: "Navigation & hesitation",
      description:
        "Screens users leave at once, modals they dismiss, and the paths from the portfolio into each feature.",
      tiles: [
        {
          name: "Screens left within 2 s",
          description: `Per screen: views with a measured dwell (the next screen in the same page reports it), the share left within 2 seconds, and the median dwell. Screens with at least ${MIN_SCREEN_VIEWS} views.`,
          size: "full",
          query: hogql(`
SELECT
  properties.previous_screen_name AS screen,
  count() AS views,
  countIf(toFloat(properties.previous_dwell_ms) < 2000) AS within_2s,
  round(100 * within_2s / views, 1) AS within_2s_pct,
  round(median(toFloat(properties.previous_dwell_ms))) AS median_dwell_ms
FROM events
WHERE event = '$screen' AND properties.previous_screen_name IS NOT NULL AND {filters}
GROUP BY screen
HAVING views >= ${MIN_SCREEN_VIEWS}
ORDER BY within_2s DESC
LIMIT 50`),
        },
        {
          name: "Modals dismissed without completing",
          description:
            "Per modal or drawer: opens, closes by escape, backdrop or button, closes after the user finished its task, opens never closed (the page closed first), and the median time open.",
          size: "full",
          query: hogql(`
SELECT
  properties.modal_id AS modal,
  countIf(event = 'modal_opened') AS opened,
  countIf(properties.dismiss = 'escape') AS escape,
  countIf(properties.dismiss = 'backdrop') AS backdrop,
  countIf(properties.dismiss = 'button') AS button,
  countIf(properties.dismiss = 'completed') AS completed,
  opened - countIf(event = 'modal_closed') AS page_closed,
  round(median(if(event = 'modal_closed', toFloat(properties.duration_ms), NULL))) AS median_open_ms
FROM events
WHERE event IN ('modal_opened', 'modal_closed') AND {filters}
GROUP BY modal
ORDER BY opened DESC
LIMIT 50`),
        },
        {
          name: "Paths from the portfolio",
          description: "The screens users go through after the portfolio home, four steps deep.",
          size: "full",
          query: paths({ startPoint: "/portfolio", stepLimit: 4 }),
        },
        {
          name: "Screens opened from the portfolio",
          description:
            "Moves from a portfolio screen to a screen outside the portfolio: which features users reach from it.",
          query: hogql(`
SELECT properties.$screen_name AS screen, count() AS opened, uniq(distinct_id) AS installs
FROM events
WHERE event = '$screen' AND startsWith(ifNull(properties.previous_screen_name, ''), '/portfolio')
  AND NOT startsWith(properties.$screen_name, '/portfolio') AND {filters}
GROUP BY screen
ORDER BY opened DESC
LIMIT 50`),
        },
        ...(catalogue.flows.length
          ? [
              {
                name: "Where flows start",
                description:
                  "Started attempts per flow, by the screen shown when it started and the entry the flow reported.",
                query: hogql(`
SELECT flow, properties.$screen_name AS screen, ifNull(properties.entry, '') AS entry, count() AS started
FROM (
  SELECT ${flowEventColumns(catalogue.flows).select}, properties
  FROM events
  WHERE ${flowEventColumns(catalogue.flows).where} AND {filters}
)
WHERE lifecycle = 'started'
GROUP BY flow, screen, entry
ORDER BY started DESC
LIMIT 100`),
              },
            ]
          : []),
      ],
    },
    {
      slug: "dapps",
      prefix: "Dapps",
      title: "Dapp requests",
      description:
        "How users decide on dapp requests: latency, rejections and the risk verdict shown, by method. Phishing sites blocked, and those the user trusted anyway.",
      tiles: [
        {
          name: "Decisions by method",
          description:
            "Per method: requests ended, the share approved, rejected, closed without a decision and expired, and p50/p90 milliseconds to the decision.",
          size: "full",
          query: hogql(`
SELECT
  properties.method AS method,
  count() AS requests,
  round(100 * countIf(properties.outcome = 'approved') / requests, 1) AS approved_pct,
  round(100 * countIf(properties.outcome = 'rejected') / requests, 1) AS rejected_pct,
  round(100 * countIf(properties.outcome = 'closed') / requests, 1) AS closed_pct,
  round(100 * countIf(properties.outcome = 'expired') / requests, 1) AS expired_pct,
  round(quantile(0.5)(toFloat(properties.time_to_decision_ms))) AS p50_ms,
  round(quantile(0.9)(toFloat(properties.time_to_decision_ms))) AS p90_ms
FROM events
WHERE event = 'dapp_request_resolved' AND {filters}
GROUP BY method
ORDER BY requests DESC`),
        },
        {
          name: "Rejection rate by method",
          description: "Rejected requests as a share of ended requests, per method.",
          query: trend({
            series: [
              ev("dapp_request_resolved", {
                name: "Rejected",
                properties: [prop("outcome", "rejected")],
              }),
              ev("dapp_request_resolved", { name: "Ended" }),
            ],
            formula: "A / B",
            breakdown: "method",
            breakdownLimit: 10,
          }),
        },
        {
          name: "Outcome by risk verdict",
          description: "Ended requests by the risk verdict the window showed and the outcome.",
          query: hogql(`
SELECT properties.risk_verdict AS verdict, properties.outcome AS outcome, count() AS requests
FROM events
WHERE event = 'dapp_request_resolved' AND {filters}
GROUP BY verdict, outcome
ORDER BY verdict, requests DESC`),
        },
        {
          name: "Phishing sites blocked and trusted",
          description:
            "Tabs redirected away from a site flagged as phishing, and blocked sites the user chose to continue to, by the check that flagged them.",
          query: trend({
            series: [
              ev("phishing_site_blocked", { name: "Blocked" }),
              ev("phishing_site_trusted", { name: "Trusted anyway" }),
            ],
            breakdown: "protection_source",
            display: "ActionsStackedBar",
          }),
        },
        {
          name: "Request render time",
          description:
            "Milliseconds from a request window starting to load to the request painted: median and p90.",
          query: trend({
            series: [
              ev("dapp_request_rendered", {
                math: "median",
                mathProperty: "render_ms",
                name: "p50",
              }),
              ev("dapp_request_rendered", { math: "p90", mathProperty: "render_ms", name: "p90" }),
            ],
          }),
        },
      ],
    },
    {
      slug: "transactions",
      prefix: "Transactions",
      title: "Transactions",
      description:
        "Transaction outcomes from the wallet and dapps: failure rate, failure categories by network, and time to settle.",
      tiles: [
        {
          name: "Transaction failure rate",
          description:
            "Failed transactions (settled as error or dropped, or failed before any node accepted them) as a share of settled plus failed broadcasts.",
          query: trend({
            series: [
              ev("tx_settled", {
                name: "Settled failed",
                properties: [prop("status", ["error", "dropped"])],
              }),
              ev("tx_broadcast_failed", { name: "Broadcast failed" }),
              ev("tx_settled", { name: "Settled" }),
            ],
            formula: "(A + B) / (B + C)",
          }),
        },
        {
          name: "Failure categories by network",
          description:
            "Failed transactions by network and category: the broadcast error category, or the settled status (error, dropped).",
          size: "full",
          query: hogql(`
SELECT
  properties.network_id AS network,
  properties.platform AS platform,
  if(event = 'tx_broadcast_failed', properties.error_category, properties.status) AS category,
  count() AS failed,
  uniq(distinct_id) AS installs
FROM events
WHERE (event = 'tx_broadcast_failed' OR (event = 'tx_settled' AND properties.status IN ('error', 'dropped'))) AND {filters}
GROUP BY network, platform, category
ORDER BY failed DESC
LIMIT 100`),
        },
        {
          name: "Settled transactions by status",
          description: "Transactions reaching a final status, by status.",
          query: trend({
            series: [ev("tx_settled", { name: "Settled" })],
            breakdown: "status",
            display: "ActionsStackedBar",
          }),
        },
        {
          name: "Time to settle",
          description:
            "p90 milliseconds from the stored transaction to its final status, by platform.",
          query: trend({
            series: [
              ev("tx_settled", { math: "p90", mathProperty: "time_to_settle_ms", name: "p90" }),
            ],
            breakdown: "platform",
          }),
        },
        {
          name: "Signed transactions by signer",
          description: "Transactions the wallet signed, by who signs for the account.",
          query: trend({
            series: [ev("tx_signed", { name: "Signed" })],
            breakdown: "signer",
            display: "ActionsStackedBar",
          }),
        },
      ],
    },
    {
      slug: "pre-release",
      prefix: "Pre-release",
      title: "Pre-release errors",
      description:
        "Exceptions from release candidates installed unpacked by QA (appVariant preview) and from canary builds, by build. Store installs never appear here.",
      audience: "pre-release",
      tiles: [
        {
          name: "Exceptions by build",
          description:
            "One row per pre-release build: the exceptions it reported, how many distinct errors, the installs that reported them, and when.",
          size: "full",
          query: hogql(`
SELECT
  properties.appVariant AS variant,
  properties.appVersion AS version,
  properties.appBuild AS build,
  count() AS reported,
  uniq(properties.$exception_fingerprint) AS errors,
  uniq(distinct_id) AS installs,
  min(timestamp) AS first_seen,
  max(timestamp) AS last_seen
FROM events
WHERE event = '$exception' AND properties.appVariant IN (${PRE_RELEASE_VARIANTS}) AND {filters}
GROUP BY variant, version, build
ORDER BY last_seen DESC
LIMIT 50`),
        },
        {
          name: "Pre-release exceptions",
          description:
            "The exceptions pre-release builds reported, one row per fingerprint and build. in_production: store installs reported the same fingerprint in the last 90 days, so it is not new in this build.",
          size: "full",
          query: hogql(`
SELECT
  properties.exception_type AS type,
  properties.$exception_fingerprint AS fingerprint,
  properties.appVersion AS version,
  properties.appBuild AS build,
  properties.mechanism AS mechanism,
  properties.handled AS handled,
  fingerprint IN (
    SELECT properties.$exception_fingerprint
    FROM events
    WHERE event = '$exception' AND properties.appVariant = 'production' AND timestamp > now() - toIntervalDay(90)
  ) AS in_production,
  count() AS reported,
  uniq(distinct_id) AS installs,
  topK(3)(properties.$screen_name) AS screens,
  max(timestamp) AS last_seen
FROM events
WHERE event = '$exception' AND properties.appVariant IN (${PRE_RELEASE_VARIANTS}) AND {filters}
GROUP BY type, fingerprint, version, build, mechanism, handled
ORDER BY last_seen DESC
LIMIT 100`),
        },
      ],
    },
  ]
}

export const PRIMARY_DASHBOARD_SLUG = "overview"

export const ALERTS: readonly Alert[] = [
  {
    name: "Transaction failure rate above 10%",
    tile: "Transaction failure rate",
    seriesIndex: 0,
    condition: "absolute_value",
    threshold: { type: "absolute", upper: 0.1 },
    interval: "daily",
  },
  {
    name: "Installs hitting an exception doubled",
    tile: "Exceptions",
    seriesIndex: 1,
    condition: "relative_increase",
    threshold: { type: "percentage", upper: 1 },
    interval: "daily",
  },
  {
    name: "Unlock failure rate above 20%",
    tile: "Unlock failure rate",
    seriesIndex: 0,
    condition: "absolute_value",
    threshold: { type: "absolute", upper: 0.2 },
    interval: "daily",
  },
  {
    name: "Daily active installs down 30%",
    tile: "DAU / WAU / MAU",
    seriesIndex: 0,
    condition: "relative_decrease",
    threshold: { type: "percentage", upper: 0.3 },
    interval: "daily",
  },
  {
    name: "Popup open time p90 up 50%",
    tile: "Popup open time",
    seriesIndex: 1,
    condition: "relative_increase",
    threshold: { type: "percentage", upper: 0.5 },
    interval: "daily",
  },
]

const dashboardNumber = (dashboards: readonly Dashboard[], spec: Dashboard) =>
  String(dashboards.indexOf(spec) + 1).padStart(Math.max(2, String(dashboards.length).length), "0")

export const dashboardName = (dashboards: readonly Dashboard[], spec: Dashboard) =>
  `${dashboardNumber(dashboards, spec)}. ${spec.title}`

export const insightName = (dashboards: readonly Dashboard[], spec: Dashboard, tile: Tile) =>
  `${dashboardNumber(dashboards, spec)}. ${spec.prefix} · ${tile.name}`

export const dashboardTitleOf = (name: string) => name.replace(/^\d+\. /, "")

export const tileNameOf = (name: string) => {
  const i = name.indexOf(" · ")
  return i === -1 ? name : name.slice(i + 3)
}

const walk = (value: unknown, visit: (node: Record<string, unknown>) => void) => {
  if (Array.isArray(value)) for (const item of value) walk(item, visit)
  else if (value && typeof value === "object") {
    visit(value as Record<string, unknown>)
    for (const child of Object.values(value)) walk(child, visit)
  }
}

const SQL_STRING = /'((?:[^'\\]|\\.)*)'/g

export const referencedEvents = (query: Query): Set<string> => {
  const events = new Set<string>()
  walk(query, (node) => {
    if (node.kind !== "EventsNode") return
    const event = node.event ?? node.id
    if (typeof event === "string") events.add(event)
  })
  if (query.kind === "DataVisualizationNode")
    for (const [, single, list] of query.source.query.matchAll(
      /\bevent\s*(?:=\s*'([^']+)'|IN\s*\(([^)]*)\))/g
    )) {
      if (single) events.add(single)
      for (const [, name] of (list ?? "").matchAll(SQL_STRING)) events.add(name)
    }
  return events
}

export const referencedProperties = (query: Query): Set<string> => {
  const properties = new Set<string>()
  walk(query, (node) => {
    if (node.type === "event" && typeof node.key === "string") properties.add(node.key)
    if (node.type === "event" && typeof node.property === "string") properties.add(node.property)
    if (typeof node.math_property === "string") properties.add(node.math_property)
  })
  if (query.kind === "DataVisualizationNode")
    for (const [, name] of query.source.query.matchAll(/\bproperties\.(\$?\w+)/g))
      properties.add(name)
  return properties
}

/** PostHog rejects an insight description longer than this. */
const MAX_INSIGHT_DESCRIPTION_LENGTH = 400

const duplicates = (values: readonly string[]) => [
  ...new Set(values.filter((v, i) => values.indexOf(v) !== i)),
]

const seriesOf = (query: Query) =>
  query.kind === "InsightVizNode" ? ((query.source.series ?? []) as readonly EventsNode[]) : []

const breakdownsOf = (query: Query) =>
  (
    (query.source.breakdownFilter as { breakdowns?: { property: string }[] } | undefined)
      ?.breakdowns ?? []
  ).map((b) => b.property)

const undeclaredReads = (
  tile: Tile,
  declaredBy: ReadonlyMap<string, ReadonlySet<string>>,
  isExempt: (property: string) => boolean
): string[] => {
  const declares = (event: string | null, property: string) =>
    event !== null && (declaredBy.get(event)?.has(property) ?? true)
  if (tile.query.kind === "DataVisualizationNode") {
    const events = [...referencedEvents(tile.query)]
    return [...referencedProperties(tile.query)]
      .filter((property) => !isExempt(property) && !events.some((e) => declares(e, property)))
      .map(
        (property) =>
          `tile "${tile.name}" reads property "${property}", which none of its events declare`
      )
  }
  const breakdowns = breakdownsOf(tile.query)
  return seriesOf(tile.query).flatMap((node) =>
    [
      ...(node.properties ?? []).map((filter) => filter.key),
      ...(node.math_property ? [node.math_property] : []),
      ...breakdowns,
    ]
      .filter((property) => !isExempt(property) && !declares(node.event, property))
      .map(
        (property) =>
          `tile "${tile.name}" reads property "${property}" on ${node.event === null ? "every event" : `"${node.event}"`}, which does not declare it`
      )
  )
}

export const specErrors = (
  dashboards: readonly Dashboard[],
  alerts: readonly Alert[],
  catalogue: CatalogueSnapshot
): string[] => {
  const tiles = dashboards.flatMap((d) => d.tiles)
  const declaredBy = new Map<string, ReadonlySet<string>>([
    ...catalogue.events.map((e) => [e.name, new Set(e.properties)] as const),
    ...Object.entries(BUILTIN_EVENTS).map(([name, props]) => [name, new Set(props)] as const),
  ])
  const events = new Set(declaredBy.keys())
  const properties = new Set(catalogue.properties.map((p) => p.name))
  const superProperties = new Set(catalogue.properties.filter((p) => p.isSuper).map((p) => p.name))
  const isExempt = (property: string) =>
    property.startsWith("$") || superProperties.has(property) || !properties.has(property)
  const errors: string[] = []
  for (const name of duplicates(dashboards.map((d) => d.slug)))
    errors.push(`dashboard slug "${name}" is used twice`)
  for (const name of duplicates(tiles.map((t) => t.name)))
    errors.push(`tile name "${name}" is used twice`)
  for (const tile of tiles) {
    if (tile.description.length > MAX_INSIGHT_DESCRIPTION_LENGTH)
      errors.push(
        `tile "${tile.name}": description is ${tile.description.length} characters, max ${MAX_INSIGHT_DESCRIPTION_LENGTH}`
      )
    for (const event of referencedEvents(tile.query))
      if (!events.has(event))
        errors.push(
          `tile "${tile.name}" reads event "${event}", which the catalogue does not define`
        )
    for (const property of referencedProperties(tile.query))
      if (!property.startsWith("$") && !properties.has(property))
        errors.push(
          `tile "${tile.name}" reads property "${property}", which the catalogue does not define`
        )
    errors.push(...undeclaredReads(tile, declaredBy, isExempt))
  }
  for (const name of duplicates(alerts.map((a) => a.name)))
    errors.push(`alert name "${name}" is used twice`)
  for (const alert of alerts) {
    const tile = tiles.find((t) => t.name === alert.tile)
    if (tile?.query.kind !== "InsightVizNode" || tile.query.source.kind !== "TrendsQuery")
      errors.push(`alert "${alert.name}" must watch a trend tile, and "${alert.tile}" is not one`)
  }
  return errors
}
