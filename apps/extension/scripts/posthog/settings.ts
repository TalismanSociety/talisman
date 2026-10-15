// biome-ignore-all lint/suspicious/noConsole: CLI script output
import type { PosthogApi } from "./api"
import { TEST_ACCOUNT_FILTERS } from "./queries"
import { changedFields } from "./reconcile"

const GEOIP_TEMPLATE = "template-geoip"
const FILTER_TEMPLATE = "template-filter-properties"
const FILTER_NAME = "Keep country and continent only"

/** GeoIP also copies every `$geoip_*` value into `$set` and `$set_once`, so those go too. */
const GEOIP_DROPPED = [
  "$geoip_city_name",
  "$geoip_city_confidence",
  "$geoip_subdivision_1_code",
  "$geoip_subdivision_1_name",
  "$geoip_subdivision_2_code",
  "$geoip_subdivision_2_name",
  "$geoip_subdivision_3_code",
  "$geoip_subdivision_3_name",
  "$geoip_postal_code",
  "$geoip_latitude",
  "$geoip_longitude",
  "$geoip_accuracy_radius",
  "$geoip_time_zone",
  "$set",
  "$set_once",
]

const PRIVACY_SETTINGS = {
  anonymize_ips: true,
  autocapture_opt_out: true,
  heatmaps_opt_in: false,
  capture_dead_clicks: false,
  capture_console_log_opt_in: false,
  capture_performance_opt_in: false,
  session_recording_opt_in: false,
  surveys_opt_in: false,
}

type Transformation = {
  id: string
  name: string
  enabled: boolean
  execution_order: number | null
  template?: { id: string }
  template_id?: string
  inputs?: { propertiesToFilter?: { value?: string } }
}

export async function reconcileProjectSettings(
  api: PosthogApi,
  {
    filterTestAccounts,
    primaryDashboardId,
  }: { filterTestAccounts: boolean; primaryDashboardId?: number }
) {
  console.log("\n▶ Project settings")
  const want = {
    ...PRIVACY_SETTINGS,
    test_account_filters: TEST_ACCOUNT_FILTERS,
    test_account_filters_default_checked: filterTestAccounts,
    ...(primaryDashboardId !== undefined && { primary_dashboard: primaryDashboardId }),
  }
  const changed = changedFields(await api.get<Partial<typeof want>>("/"), want)
  if (Object.keys(changed).length) {
    console.log(`  update project: ${Object.keys(changed).join(", ")}`)
    await api.patch("/", changed)
  } else console.log("  project settings up to date")

  const transformations = await api.listAll<Transformation>(
    "/hog_functions/?type=transformation&limit=100"
  )
  const geoip = transformations.find((fn) => (fn.template?.id ?? fn.template_id) === GEOIP_TEMPLATE)
  if (!geoip)
    throw new Error("GeoIP transformation missing: enable it in Data pipelines → Transformations")
  if (!geoip.enabled || geoip.execution_order !== 1) {
    console.log("  update GeoIP transformation: enabled, execution_order 1")
    await api.patch(`/hog_functions/${geoip.id}/`, { enabled: true, execution_order: 1 })
  }

  const inputs = { propertiesToFilter: { value: GEOIP_DROPPED.join(",") } }
  const listed = transformations.find((fn) => fn.name === FILTER_NAME)
  const filter = listed && (await api.get<Transformation>(`/hog_functions/${listed.id}/`))
  if (!filter) {
    console.log(`  create transformation "${FILTER_NAME}"`)
    await api.post("/hog_functions/", {
      type: "transformation",
      name: FILTER_NAME,
      template_id: FILTER_TEMPLATE,
      inputs,
      enabled: true,
      execution_order: 2,
    })
  } else if (
    !filter.enabled ||
    filter.execution_order !== 2 ||
    filter.inputs?.propertiesToFilter?.value !== inputs.propertiesToFilter.value
  ) {
    console.log(`  update transformation "${FILTER_NAME}"`)
    await api.patch(`/hog_functions/${filter.id}/`, { inputs, enabled: true, execution_order: 2 })
  } else console.log("  property filter up to date")
}
