// biome-ignore-all lint/suspicious/noConsole: CLI script output
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"

import { HttpError, ingest, PosthogApi } from "./api"
import {
  ALERTS,
  type Alert,
  buildDashboards,
  type CatalogueSnapshot,
  catalogueSnapshot,
  type Dashboard,
  dashboardName,
  dashboardTitleOf,
  insightName,
  PRIMARY_DASHBOARD_SLUG,
  specErrors,
  type Tile,
  tileNameOf,
} from "./dashboards"
import {
  definitionChanges,
  eventDefinitionSpecs,
  eventsToSeed,
  propertyDefinitionSpecs,
  type StoredDefinition,
  seedBatch,
} from "./definitions"
import { withTestAccountFilter } from "./queries"
import {
  changedFields,
  computeLayouts,
  isManaged,
  isSame,
  jsonDiff,
  MANAGED_TAG,
  pickByName,
  withoutSchemaVersion,
  withTags,
} from "./reconcile"
import { reconcileProjectSettings } from "./settings"

const USAGE = `
Usage: pnpm posthog:provision [-- flags]

Env (apps/extension/.env):
  POSTHOG_PERSONAL_API_KEY   Personal API key (scopes in README.md)
  POSTHOG_PROJECT_ID         Numeric project id
  POSTHOG_API_HOST           API host (default https://us.posthog.com)
  POSTHOG_PROJECT_TOKEN      Project token, for --seed
  POSTHOG_HOST               Ingestion host, for --seed (the z.talisman.xyz proxy)
  POSTHOG_ALERTS_DISCORD_WEBHOOK_URL
                             Optional: every alert also posts to this Discord webhook

Flags:
  --dry-run             Read the live project and print what would change; write nothing
  --seed                Send one development-variant event per catalogue event PostHog has no
                        definition for, then wait for the definitions
  --check-queries       Run every tile's query through /query/ (writes nothing)
  --only <slug>         Reconcile one dashboard (repeatable)
  --prune               Soft-delete managed insights and alerts no longer in the spec
  --skip-definitions    Leave event and property definitions alone
  --annotate-release    Add a "Release v<version>" annotation for today, once per version
  --show-test-accounts  Save insights with "Filter out internal and test users" off
  --catalogue <dir>     Analytics directory to read (default src/common/analytics)
  --verbose             Print request payloads (credentials redacted)
`.trim()

const DISCORD_WEBHOOK = /^https:\/\/discord\.com\/api\/webhooks\//
const SEED_POLL_INTERVAL_MS = 15_000
const SEED_POLL_TIMEOUT_MS = 10 * 60_000

type Cli = ReturnType<typeof parseCli>

const parseCli = () => {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      seed: { type: "boolean", default: false },
      "check-queries": { type: "boolean", default: false },
      only: { type: "string", multiple: true, default: [] },
      prune: { type: "boolean", default: false },
      "skip-definitions": { type: "boolean", default: false },
      "annotate-release": { type: "boolean", default: false },
      "show-test-accounts": { type: "boolean", default: false },
      catalogue: { type: "string", default: "src/common/analytics" },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  })
  if (values.help) {
    console.log(USAGE)
    process.exit(0)
  }
  const env = process.env
  const discordWebhookUrl = env.POSTHOG_ALERTS_DISCORD_WEBHOOK_URL || undefined
  if (discordWebhookUrl && !DISCORD_WEBHOOK.test(discordWebhookUrl)) {
    console.error(
      "POSTHOG_ALERTS_DISCORD_WEBHOOK_URL must start with https://discord.com/api/webhooks/."
    )
    process.exit(2)
  }
  return {
    dryRun: values["dry-run"],
    seed: values.seed,
    checkQueries: values["check-queries"],
    only: values.only,
    prune: values.prune,
    skipDefinitions: values["skip-definitions"],
    annotateRelease: values["annotate-release"],
    filterTestAccounts: !values["show-test-accounts"],
    catalogueDir: path.resolve(values.catalogue),
    verbose: values.verbose,
    apiKey: env.POSTHOG_PERSONAL_API_KEY,
    projectId: env.POSTHOG_PROJECT_ID,
    apiHost: (env.POSTHOG_API_HOST || "https://us.posthog.com").replace(/\/+$/, ""),
    projectToken: env.POSTHOG_PROJECT_TOKEN,
    ingestHost: env.POSTHOG_HOST,
    discordWebhookUrl,
  }
}

const loadCatalogue = async (dir: string): Promise<CatalogueSnapshot> => {
  const moduleUrl = (file: string) => pathToFileURL(path.join(dir, file)).href
  const { catalogueDefinitions }: typeof import("@common/analytics/catalogue") = await import(
    moduleUrl("catalogue.ts")
  )
  const { flowList }: typeof import("@common/analytics/flow/registry") = await import(
    moduleUrl("flow/registry.ts")
  )
  return catalogueSnapshot(catalogueDefinitions(), flowList())
}

type StoredDashboard = {
  id: number
  name: string
  description?: string
  tags?: string[]
  deleted?: boolean
}
type StoredInsight = {
  id: number
  name: string
  description?: string
  tags?: string[]
  deleted?: boolean
  query?: unknown
  dashboards?: number[]
  dashboard_tiles?: { dashboard_id: number; deleted?: boolean }[]
}

type State = {
  dashboards: StoredDashboard[]
  insights: StoredInsight[]
  resolved: Map<string, StoredDashboard>
  claimedInsightIds: Set<number>
  insightIdByTile: Map<string, number>
}

const loadState = async (api: PosthogApi): Promise<State> => {
  const [dashboards, insights] = await Promise.all([
    api.listAll<StoredDashboard>("/dashboards/?limit=100"),
    api.listAll<StoredInsight>(
      "/insights/?limit=100&saved=true&basic=true&include_dashboards=true"
    ),
  ])
  console.log(
    `\nFound ${dashboards.length} dashboards and ${insights.length} saved insights; ` +
      `${dashboards.filter(isManaged).length} and ${insights.filter(isManaged).length} managed.`
  )
  return {
    dashboards: dashboards.filter((d) => isManaged(d) && !d.deleted),
    insights: insights.filter((i) => isManaged(i) && !i.deleted && i.name),
    resolved: new Map(),
    claimedInsightIds: new Set(),
    insightIdByTile: new Map(),
  }
}

const findDashboard = (state: State, dashboards: readonly Dashboard[], spec: Dashboard) =>
  pickByName(
    state.dashboards.filter((d) => dashboardTitleOf(d.name) === spec.title),
    dashboardName(dashboards, spec)
  )

const findInsight = (state: State, dashboards: readonly Dashboard[], spec: Dashboard, tile: Tile) =>
  pickByName(
    state.insights.filter((i) => tileNameOf(i.name) === tile.name),
    insightName(dashboards, spec, tile)
  )

const attachedDashboardIds = (insight: StoredInsight) =>
  new Set([
    ...(insight.dashboards ?? []),
    ...(insight.dashboard_tiles ?? []).filter((t) => !t.deleted).map((t) => t.dashboard_id),
  ])

async function reconcileDashboard(
  api: PosthogApi,
  cli: Cli,
  state: State,
  dashboards: readonly Dashboard[],
  spec: Dashboard
) {
  const name = dashboardName(dashboards, spec)
  console.log(`\n▶ ${name}  (${spec.slug}, ${spec.tiles.length} tiles)`)
  let dashboard = findDashboard(state, dashboards, spec)
  const created = !dashboard
  if (!dashboard) {
    console.log("  create dashboard")
    dashboard = await api.post<StoredDashboard>("/dashboards/", {
      name,
      description: spec.description,
      tags: [MANAGED_TAG],
      pinned: true,
    })
    state.dashboards.push(dashboard)
  } else {
    const changed = changedFields(
      {
        name: dashboard.name,
        description: dashboard.description ?? "",
        tags: dashboard.tags ?? [],
      },
      { name, description: spec.description, tags: withTags(dashboard.tags) }
    )
    if (Object.keys(changed).length) {
      console.log(`  update dashboard #${dashboard.id}: ${Object.keys(changed).join(", ")}`)
      await api.patch(`/dashboards/${dashboard.id}/`, changed)
    } else console.log(`  dashboard #${dashboard.id} up to date`)
  }
  const dashboardId = dashboard.id

  const insightIds: number[] = []
  for (const tile of spec.tiles) {
    const insightTitle = insightName(dashboards, spec, tile)
    const existing = findInsight(state, dashboards, spec, tile)
    const query = withTestAccountFilter(tile.query, cli.filterTestAccounts)
    if (!existing) {
      console.log(`  create insight "${insightTitle}"`)
      const created = await api.post<StoredInsight>("/insights/?include_dashboards=true", {
        name: insightTitle,
        description: tile.description,
        tags: [MANAGED_TAG],
        query,
        saved: true,
        dashboards: [dashboardId],
      })
      state.insights.push(created)
      state.claimedInsightIds.add(created.id)
      state.insightIdByTile.set(tile.name, created.id)
      insightIds.push(created.id)
      continue
    }
    insightIds.push(existing.id)
    state.claimedInsightIds.add(existing.id)
    state.insightIdByTile.set(tile.name, existing.id)
    const changed: Record<string, unknown> = changedFields(
      { name: existing.name, description: existing.description ?? "", tags: existing.tags ?? [] },
      { name: insightTitle, description: tile.description, tags: withTags(existing.tags) }
    )
    const storedQuery = withoutSchemaVersion(existing.query)
    if (!("query" in existing) || !isSame(storedQuery, query)) changed.query = query
    const attached = attachedDashboardIds(existing)
    const stray = state.dashboards
      .filter((d) => d.id !== dashboardId && attached.has(d.id))
      .map((d) => d.id)
    if (!attached.has(dashboardId) || stray.length)
      changed.dashboards = [
        ...new Set([...[...attached].filter((id) => !stray.includes(id)), dashboardId]),
      ]
    if (!Object.keys(changed).length) {
      console.log(`  insight #${existing.id} "${insightTitle}" up to date`)
      continue
    }
    console.log(
      `  update insight #${existing.id} "${insightTitle}": ${Object.keys(changed).join(", ")}`
    )
    if (changed.query && (cli.dryRun || cli.verbose) && "query" in existing)
      for (const line of jsonDiff(storedQuery, query)) console.log(`    query.${line}`)
    await api.patch(`/insights/${existing.id}/?include_dashboards=true`, changed)
  }

  if (!(cli.dryRun && created)) await applyLayouts(api, dashboardId, spec, insightIds)
  state.resolved.set(spec.slug, dashboard)
}

/**
 * Best-effort: the layout PATCH is not in PostHog's documented API, so a failure is only logged.
 * PostHog stores only x, y, w and h, so the spec holds no more.
 */
async function applyLayouts(
  api: PosthogApi,
  dashboardId: number,
  spec: Dashboard,
  insightIds: number[]
) {
  try {
    const layouts = computeLayouts(spec.tiles)
    const full = await api.get<{
      tiles?: {
        id: number
        deleted?: boolean
        insight?: { id: number }
        layouts?: { sm?: unknown }
      }[]
    }>(`/dashboards/${dashboardId}/`)
    const tileByInsight = new Map(
      (full.tiles ?? []).filter((t) => t.insight && !t.deleted).map((t) => [t.insight?.id, t])
    )
    const tiles = insightIds.flatMap((insightId, index) => {
      const tile = tileByInsight.get(insightId)
      return tile && !isSame(tile.layouts?.sm ?? null, layouts[index].sm)
        ? [{ id: tile.id, layouts: layouts[index] }]
        : []
    })
    if (tiles.length) {
      console.log(`  update layouts of ${tiles.length} tiles`)
      await api.patch(`/dashboards/${dashboardId}/`, { tiles })
    } else console.log("  layouts up to date")
  } catch (error) {
    console.warn(`  ! layout update skipped: ${String((error as Error).message).split("\n")[0]}`)
  }
}

async function pruneInsights(
  api: PosthogApi,
  state: State,
  dashboards: readonly Dashboard[],
  selected: readonly Dashboard[]
) {
  const allTiles = new Set(dashboards.flatMap((d) => d.tiles.map((t) => t.name)))
  const selectedTiles = new Set(selected.flatMap((d) => d.tiles.map((t) => t.name)))
  const selectedIds = new Set(selected.map((d) => state.resolved.get(d.slug)?.id))
  const everything = selected.length === dashboards.length
  const stale = state.insights.filter((insight) => {
    if (state.claimedInsightIds.has(insight.id)) return false
    const tile = tileNameOf(insight.name)
    if (selectedTiles.has(tile)) return true
    if (allTiles.has(tile)) return false
    return everything || [...attachedDashboardIds(insight)].some((id) => selectedIds.has(id))
  })
  console.log(
    stale.length
      ? `\nprune: soft-deleting ${stale.length} managed insight(s)`
      : "\nprune: nothing to remove"
  )
  for (const insight of stale) {
    console.log(`  delete insight #${insight.id} "${insight.name}"`)
    await api.patch(`/insights/${insight.id}/`, { deleted: true })
  }
}

async function ensurePrimaryDashboard(api: PosthogApi, dashboardId: number | undefined) {
  if (dashboardId === undefined) return
  const project = await api.get<{ primary_dashboard?: number | null }>("/")
  if (project.primary_dashboard === dashboardId) return
  console.log(`\n▶ Project: primary dashboard → #${dashboardId}`)
  await api.patch("/", { primary_dashboard: dashboardId })
}

type StoredAlert = {
  id: string
  name: string
  insight: number | { id: number }
  subscribed_users?: (number | { id: number })[]
  threshold?: {
    configuration?: { type?: string; bounds?: { lower?: number | null; upper?: number | null } }
  }
  condition?: { type?: string }
  config?: { type?: string; series_index?: number; check_ongoing_interval?: boolean }
  calculation_interval?: string
  enabled?: boolean
}

const insightIdOf = (alert: StoredAlert) =>
  typeof alert.insight === "number" ? alert.insight : alert.insight?.id

const alertBody = (alert: Alert, insightId: number) => ({
  name: alert.name,
  insight: insightId,
  threshold: {
    configuration: {
      type: alert.threshold.type,
      bounds: { lower: alert.threshold.lower ?? null, upper: alert.threshold.upper ?? null },
    },
  },
  condition: { type: alert.condition },
  config: {
    type: "TrendsAlertConfig",
    series_index: alert.seriesIndex,
    check_ongoing_interval: false,
  },
  calculation_interval: alert.interval,
  enabled: true,
})

const alertCurrent = (stored: StoredAlert) => ({
  name: stored.name,
  insight: insightIdOf(stored),
  threshold: {
    configuration: {
      type: stored.threshold?.configuration?.type,
      bounds: {
        lower: stored.threshold?.configuration?.bounds?.lower ?? null,
        upper: stored.threshold?.configuration?.bounds?.upper ?? null,
      },
    },
  },
  condition: { type: stored.condition?.type },
  config: {
    type: stored.config?.type,
    series_index: stored.config?.series_index,
    check_ongoing_interval: stored.config?.check_ongoing_interval ?? false,
  },
  calculation_interval: stored.calculation_interval,
  enabled: stored.enabled,
})

const subscriberIds = (stored?: StoredAlert) =>
  (stored?.subscribed_users ?? []).map((user) => (typeof user === "number" ? user : user.id))

const ALERT_FIRING_EVENT = "$insight_alert_firing"
const DISCORD_TEMPLATE_ID = "template-discord"
const DISCORD_ALERT_CONTENT =
  "**Alert '{event.properties.alert_name}' firing** for insight '{event.properties.insight_name}'\n" +
  "{event.properties.breaches}\n" +
  "{project.url}/insights/{event.properties.insight_id}/alerts?alert_id={event.properties.alert_id}"

type StoredFunction = {
  id: string
  type?: string
  name?: string
  enabled?: boolean
  deleted?: boolean
  template_id?: string
  template?: { id: string }
  filters?: {
    source?: string
    events?: { id: string; type: string }[]
    properties?: { key: string; value: unknown; operator: string; type: string }[]
  }
  inputs?: Record<string, { value?: unknown }>
}

const discordBody = (alertName: string, alertId: string, webhookUrl: string) => ({
  name: `${alertName}: Discord`,
  enabled: true,
  filters: {
    source: "internal-events",
    events: [{ id: ALERT_FIRING_EVENT, type: "events" }],
    properties: [{ key: "alert_id", value: alertId, operator: "exact", type: "event" }],
  },
  inputs: {
    webhookUrl: { value: webhookUrl },
    content: { value: DISCORD_ALERT_CONTENT },
    allowedMentions: { value: "none" },
  },
})

const discordCurrent = (fn: StoredFunction) => ({
  name: fn.name,
  enabled: fn.enabled,
  filters: {
    source: fn.filters?.source,
    events: (fn.filters?.events ?? []).map(({ id, type }) => ({ id, type })),
    properties: (fn.filters?.properties ?? []).map(({ key, value, operator, type }) => ({
      key,
      value,
      operator,
      type,
    })),
  },
  inputs: Object.fromEntries(
    ["webhookUrl", "content", "allowedMentions"].map((key) => [
      key,
      { value: fn.inputs?.[key]?.value },
    ])
  ),
})

/** Discord destinations per alert id. Without `full=true` the list omits template_id and inputs. */
const loadDiscordDestinations = async (api: PosthogApi) => {
  const byAlertId = new Map<string, StoredFunction[]>()
  for (const fn of await api.listAll<StoredFunction>(
    "/hog_functions/?type=internal_destination&full=true&limit=100"
  )) {
    if (fn.deleted || (fn.template_id ?? fn.template?.id) !== DISCORD_TEMPLATE_ID) continue
    if (!(fn.filters?.events ?? []).some((e) => e.id === ALERT_FIRING_EVENT)) continue
    const alertId = (fn.filters?.properties ?? []).find((p) => p.key === "alert_id")?.value
    if (alertId == null) continue
    byAlertId.set(String(alertId), [...(byAlertId.get(String(alertId)) ?? []), fn])
  }
  return byAlertId
}

const deleteDestinations = async (api: PosthogApi, destinations: readonly StoredFunction[]) => {
  for (const fn of destinations) {
    console.log(`    delete Discord destination #${fn.id}`)
    await api.patch(`/hog_functions/${fn.id}/`, { deleted: true })
  }
}

async function reconcileDiscord(
  api: PosthogApi,
  webhookUrl: string,
  alertName: string,
  alertId: string,
  existing: readonly StoredFunction[]
) {
  const body = discordBody(alertName, alertId, webhookUrl)
  const [first, ...extra] = existing
  if (!first) {
    console.log(`    create Discord destination for "${alertName}"`)
    await api.post("/hog_functions/", {
      type: "internal_destination",
      template_id: DISCORD_TEMPLATE_ID,
      ...body,
    })
  } else {
    const changed = changedFields(discordCurrent(first), body)
    if (Object.keys(changed).length) {
      console.log(`    update Discord destination #${first.id}: ${Object.keys(changed).join(", ")}`)
      await api.patch(`/hog_functions/${first.id}/`, changed)
    }
  }
  await deleteDestinations(api, extra)
}

async function reconcileAlerts(api: PosthogApi, cli: Cli, state: State) {
  const wanted = ALERTS.filter((alert) => state.insightIdByTile.has(alert.tile))
  console.log(`\n▶ Alerts (${wanted.length})`)
  const managedIds = new Set(state.insights.map((i) => i.id))
  const existing = (
    await api.listAll<StoredAlert>(`/alerts/?limit=100&insight_tag=${MANAGED_TAG}`)
  ).filter((a) => managedIds.has(insightIdOf(a) ?? -1))
  const me = await api.get<{ id: number }>(`${api.host}/api/users/@me/`)
  const discord =
    cli.discordWebhookUrl || cli.prune
      ? await loadDiscordDestinations(api)
      : new Map<string, StoredFunction[]>()
  for (const alert of wanted) {
    const insightId = state.insightIdByTile.get(alert.tile) ?? -1
    const body = alertBody(alert, insightId)
    const stored = existing.find((a) => a.name === alert.name)
    const subscribers = [...new Set([...subscriberIds(stored), me.id])]
    let alertId = stored?.id
    if (!stored) {
      console.log(`  create alert "${alert.name}" on "${alert.tile}"`)
      alertId = (
        await api.post<StoredAlert>("/alerts/", { ...body, subscribed_users: subscribers })
      ).id
    } else {
      const changed: Record<string, unknown> = changedFields(alertCurrent(stored), body)
      if (!subscriberIds(stored).includes(me.id)) changed.subscribed_users = subscribers
      if (Object.keys(changed).length) {
        console.log(`  update alert "${alert.name}": ${Object.keys(changed).join(", ")}`)
        await api.patch(`/alerts/${stored.id}/`, changed)
      } else console.log(`  alert "${alert.name}" up to date`)
    }
    if (cli.discordWebhookUrl && alertId !== undefined)
      await reconcileDiscord(
        api,
        cli.discordWebhookUrl,
        alert.name,
        String(alertId),
        discord.get(String(alertId)) ?? []
      )
  }
  if (!cli.prune) return
  const names = new Set(ALERTS.map((a) => a.name))
  const reconciled = new Set(state.insightIdByTile.values())
  for (const alert of existing) {
    if (names.has(alert.name) || !reconciled.has(insightIdOf(alert) ?? -1)) continue
    console.log(`  delete alert "${alert.name}" (not in ALERTS)`)
    await deleteDestinations(api, discord.get(String(alert.id)) ?? [])
    await api.delete(`/alerts/${alert.id}/`)
  }
}

const EVENT_DEFINITIONS = "/event_definitions/?limit=100"
const PROPERTY_DEFINITIONS = "/property_definitions/?type=event&limit=100"

const storedNames = async (api: PosthogApi) => {
  const [events, properties] = await Promise.all([
    api.listAll<StoredDefinition>(EVENT_DEFINITIONS),
    api.listAll<StoredDefinition>(PROPERTY_DEFINITIONS),
  ])
  return {
    events: new Set(events.map((d) => d.name)),
    properties: new Set(properties.map((d) => d.name)),
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** PostHog creates a definition only for an event it has received. */
async function seed(api: PosthogApi, cli: Cli, catalogue: CatalogueSnapshot) {
  console.log("\n▶ Seed")
  if (!cli.projectToken || !cli.ingestHost)
    throw new Error("--seed needs POSTHOG_PROJECT_TOKEN and POSTHOG_HOST")
  const stored = await storedNames(api)
  const events = eventsToSeed(catalogue, stored.events, stored.properties)
  if (!events.length) {
    console.log("  every seedable event and property has a definition")
    return
  }
  const batch = seedBatch(catalogue, events, {
    distinctId: randomUUID(),
    newUuid: randomUUID,
    now: new Date(),
  })
  console.log(
    `  ${cli.dryRun ? "[dry-run] would send" : "sending"} ${batch.length} events: ${events.map((e) => e.name).join(", ")}`
  )
  if (cli.dryRun) return
  for (let i = 0; i < batch.length; i += 50)
    await ingest(cli.ingestHost, cli.projectToken, batch.slice(i, i + 50))

  const wantEvents = events.map((e) => e.name)
  const wantProperties = [
    ...new Set([
      ...events.flatMap((e) => e.properties),
      ...catalogue.properties.filter((p) => p.isSuper).map((p) => p.name),
    ]),
  ]
  const deadline = Date.now() + SEED_POLL_TIMEOUT_MS
  for (;;) {
    await sleep(SEED_POLL_INTERVAL_MS)
    const now = await storedNames(api)
    const missing = [
      ...wantEvents.filter((name) => !now.events.has(name)),
      ...wantProperties.filter((name) => !now.properties.has(name)),
    ]
    if (!missing.length) {
      console.log("  every seeded definition exists")
      return
    }
    if (Date.now() > deadline) {
      console.warn(`  ! still missing after the wait, synced next run: ${missing.join(", ")}`)
      return
    }
    console.log(`  waiting for ${missing.length} definitions`)
  }
}

async function reconcileDefinitions(api: PosthogApi, catalogue: CatalogueSnapshot) {
  console.log("\n▶ Definitions")
  const kinds = [
    {
      label: "event",
      list: EVENT_DEFINITIONS,
      path: "/event_definitions/",
      specs: eventDefinitionSpecs(catalogue),
    },
    {
      label: "property",
      list: PROPERTY_DEFINITIONS,
      path: "/property_definitions/",
      specs: propertyDefinitionSpecs(catalogue),
    },
  ]
  for (const kind of kinds) {
    const stored = new Map((await api.listAll<StoredDefinition>(kind.list)).map((d) => [d.name, d]))
    const unseen: string[] = []
    let upToDate = 0
    const failed: string[] = []
    for (const spec of kind.specs) {
      const definition = stored.get(spec.name)
      if (!definition) {
        unseen.push(spec.name)
        continue
      }
      const changed = definitionChanges(spec, definition)
      if (!Object.keys(changed).length) {
        upToDate++
        continue
      }
      console.log(`  update ${kind.label} "${spec.name}": ${Object.keys(changed).join(", ")}`)
      try {
        await api.patch(`${kind.path}${definition.id}/`, changed)
      } catch (error) {
        if (!(error instanceof HttpError) || error.status >= 500) throw error
        failed.push(`${spec.name} (HTTP ${error.status})`)
      }
    }
    console.log(`  ${upToDate} ${kind.label} definitions up to date`)
    if (unseen.length)
      console.log(
        `  ${unseen.length} ${kind.label}(s) not received yet, skipped: ${unseen.join(", ")}`
      )
    if (failed.length)
      console.warn(`  ! ${failed.length} ${kind.label}(s) refused: ${failed.join(", ")}`)
  }
}

async function checkQueries(api: PosthogApi, cli: Cli, dashboards: readonly Dashboard[]) {
  const tiles = dashboards.flatMap((d) => d.tiles)
  console.log(`\n▶ Query check (${tiles.length} tiles)`)
  const failures: string[] = []
  for (const tile of tiles) {
    try {
      await api.query(withTestAccountFilter(tile.query, cli.filterTestAccounts).source)
    } catch (error) {
      failures.push(
        `  ✗ ${tile.name}: ${String((error as Error).message)
          .split("\n")
          .slice(1)
          .join(" ")
          .slice(0, 400)}`
      )
    }
  }
  console.log(`  ${tiles.length - failures.length}/${tiles.length} queries ran`)
  for (const line of failures) console.log(line)
  return failures.length
}

async function annotateRelease(api: PosthogApi) {
  const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string }
  const content = `Release v${version}`
  console.log(`\n▶ Annotation "${content}"`)
  const existing = await api.listAll<{ content?: string; deleted?: boolean }>(
    `/annotations/?limit=100&search=${encodeURIComponent(content)}`
  )
  if (existing.some((a) => a.content === content && !a.deleted)) console.log("  already there")
  else
    await api.post("/annotations/", {
      content,
      date_marker: new Date().toISOString(),
      scope: "project",
    })
}

function printPlan(
  cli: Cli,
  catalogue: CatalogueSnapshot,
  dashboards: readonly Dashboard[],
  selected: readonly Dashboard[]
) {
  console.log(`API host     ${cli.apiHost}`)
  console.log(`Project      ${cli.projectId ?? "(unset)"}`)
  console.log(`Catalogue    ${cli.catalogueDir}`)
  console.log(
    `             ${catalogue.events.length} events, ${catalogue.properties.length} properties, ${catalogue.flows.length} flows`
  )
  console.log(`Test users   ${cli.filterTestAccounts ? "filtered" : "shown"}`)
  console.log(`Discord      ${cli.discordWebhookUrl ? "yes" : "unchanged (no webhook URL)"}`)
  console.log(
    `Mode         ${cli.dryRun ? "dry run" : "write"}${cli.seed ? " + seed" : ""}${cli.prune ? " + prune" : ""}`
  )
  console.log("\nPlan:")
  for (const spec of selected) {
    console.log(`  ${dashboardName(dashboards, spec)}  [${spec.slug}]`)
    for (const tile of spec.tiles)
      console.log(`    - ${insightName(dashboards, spec, tile)}  (${tile.query.source.kind})`)
  }
  console.log(`  Alerts: ${ALERTS.map((a) => a.name).join("; ")}`)
}

async function main() {
  const cli = parseCli()
  const catalogue = await loadCatalogue(cli.catalogueDir)
  const dashboards = buildDashboards(catalogue)
  const unknown = cli.only.filter((slug) => !dashboards.some((d) => d.slug === slug))
  if (unknown.length) throw new Error(`Unknown --only slug(s): ${unknown.join(", ")}`)
  const selected = cli.only.length
    ? dashboards.filter((d) => cli.only.includes(d.slug))
    : dashboards
  printPlan(cli, catalogue, dashboards, selected)

  const errors = specErrors(dashboards, ALERTS, catalogue)
  if (errors.length) {
    console.error(
      `\nThe spec disagrees with the catalogue (${errors.length}):\n${errors.map((e) => `  - ${e}`).join("\n")}`
    )
    if (!cli.dryRun) process.exit(1)
  }
  if (!cli.apiKey || !cli.projectId) {
    if (cli.dryRun) {
      console.log("\nNo POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID: plan only.")
      return
    }
    throw new Error("POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID are required")
  }

  const api = new PosthogApi(cli.apiHost, cli.projectId, cli.apiKey, cli.dryRun, cli.verbose)
  const state = await loadState(api)
  const primary = dashboards.find((d) => d.slug === PRIMARY_DASHBOARD_SLUG)
  await reconcileProjectSettings(api, {
    filterTestAccounts: cli.filterTestAccounts,
    primaryDashboardId: primary && findDashboard(state, dashboards, primary)?.id,
  })
  if (cli.seed) await seed(api, cli, catalogue)
  if (!cli.skipDefinitions) await reconcileDefinitions(api, catalogue)
  for (const spec of selected) await reconcileDashboard(api, cli, state, dashboards, spec)
  if (!cli.dryRun) await ensurePrimaryDashboard(api, state.resolved.get(PRIMARY_DASHBOARD_SLUG)?.id)
  await reconcileAlerts(api, cli, state)
  if (cli.prune) await pruneInsights(api, state, dashboards, selected)
  if (cli.annotateRelease) await annotateRelease(api)
  const failedQueries = cli.checkQueries ? await checkQueries(api, cli, selected) : 0

  console.log(cli.dryRun ? "\nDry run complete: nothing was written." : "\nDone.")
  if (!cli.dryRun)
    for (const spec of selected) {
      const d = state.resolved.get(spec.slug)
      if (d)
        console.log(
          `  ${dashboardName(dashboards, spec)}: ${cli.apiHost}/project/${cli.projectId}/dashboard/${d.id}`
        )
    }
  if (failedQueries || (cli.dryRun && errors.length)) process.exitCode = 1
}

main().catch((error) => {
  console.error(`\nFailed: ${(error as Error).message ?? error}`)
  process.exit(1)
})
