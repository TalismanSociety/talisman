import { join, relative } from "node:path"

import { catalogue, catalogueDefinitions } from "@common/analytics/catalogue"
import { flowList } from "@common/analytics/flow/registry"
import { describe, expect, it } from "vitest"

import { emittersIn, flowUsesIn, readStripped } from "./analyticsScan"
import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * Every event the catalogue defines is sent by something, and every flow can end. A dead event
 * is a funnel step that never fills, so it fails here instead of in a dashboard.
 *
 * The scan reads non-test source under apps/extension/src with comments stripped. Event names
 * must be string literals at `track(` calls so it can see them.
 */
const SRC = join(REPO_ROOT, "apps/extension/src")

const MOBILE_SHARED: Readonly<Record<string, readonly string[]>> = {
  send_started: ["entry"],
  send_submitted: [
    "platform",
    "network_id",
    "token_symbol",
    "signer",
    "usd_bucket",
    "fee_usd_bucket",
    "recipient_source",
  ],
  send_failed: ["platform", "network_id", "error_category", "phase", "signer"],
  swap_started: ["entry", "prefill_from_token"],
  swap_submitted: [
    "protocol",
    "platform",
    "from_network_id",
    "to_network_id",
    "from_symbol",
    "to_symbol",
    "signer",
    "cross_chain",
    "usd_bucket",
    "fee_usd_bucket",
    "slippage_percent",
    "slippage_is_default",
  ],
  swap_failed: ["protocol", "error_category", "phase"],
  swap_completed: ["swap_status", "protocol", "duration_ms", "cross_chain"],
  swap_abandoned: ["stage"],
  staking_started: ["entry", "mode"],
  staking_submitted: [
    "direction",
    "symbol",
    "signer",
    "usd_bucket",
    "slippage_percent",
    "slippage_is_default",
  ],
  staking_completed: ["status", "direction", "time_to_settle_ms"],
  staking_failed: ["direction", "error_category"],
  staking_subnet_selected: ["netuid", "is_root"],
  staking_validator_selected: [
    "is_default",
    "is_featured",
    "is_root",
    "sort",
    "searched",
    "position",
  ],
  staking_mev_shield_toggled: ["enabled", "direction"],
  staking_slippage_changed: ["slippage_percent", "preset", "is_default"],
  onboarding_started: ["entry"],
  onboarding_completed: ["origin", "wallet_type"],
  password_set: ["biometrics_offered"],
  app_unlock_failed: ["method", "reason"],
  account_created: ["origin", "wallet_type", "is_first_account", "flow"],
  account_watch_added: ["wallet_type", "flow"],
  ledger_accounts_imported: ["count", "platform"],
  account_removed: ["account_type"],
  item_renamed: ["item"],
  folder_created: ["tree"],
  folder_deleted: ["accounts_in_folder"],
  account_moved: ["item", "action", "tree"],
  watched_account_portfolio_toggled: ["in_portfolio"],
  swap_quote_received: [
    "quote_count",
    "protocols",
    "latency_ms",
    "from_network_id",
    "to_network_id",
    "from_symbol",
    "to_symbol",
    "from_token_id",
    "to_token_id",
    "usd_bucket",
  ],
  swap_quote_failed: [
    "protocol",
    "error_category",
    "from_network_id",
    "to_network_id",
    "from_symbol",
    "to_symbol",
    "from_token_id",
    "to_token_id",
    "usd_bucket",
  ],
  swap_approval_submitted: ["protocol", "network_id", "is_revoke"],
  tx_replace_requested: ["replace_type"],
  contact_added: ["source", "platform", "has_network", "name_service"],
  receive_opened: ["entry"],
  receive_address_copied: ["network_id", "address_format"],
  buy_opened: ["tab"],
  buy_provider_launched: ["provider", "fiat_currency", "token_symbol", "network_id", "direction"],
  custom_network_saved: ["mode", "platform", "network_id", "testnet"],
  network_toggled: ["network_id", "enabled", "platform", "default_enabled"],
  custom_token_added: ["network_id", "token_symbol", "has_coingecko_id"],
  token_toggled: ["token_symbol", "network_id", "enabled", "default_enabled"],
  custom_network_deleted: ["network_id", "platform"],
  custom_token_deleted: ["network_id"],
  contact_edited: ["network_changed"],
  setting_changed: ["key", "value"],
  language_changed: ["language_code"],
  auto_lock_changed: ["timeout_ms"],
  account_switched: ["selection", "accounts_total"],
  token_details_opened: ["symbol", "network_id"],
  search_performed: ["surface", "query_length", "result_count"],
}

const scans = listSourceFiles(SRC).map((file) => {
  const code = readStripped(file)
  return { file: relative(SRC, file), emitters: emittersIn(code), flows: flowUsesIn(code) }
})

const literalEmitters = new Set(
  scans.flatMap(({ emitters }) => [...emitters.literal, ...emitters.envelope])
)
const reported = (flow: string, method: string) =>
  scans.some(({ flows }) => flows.reports.some((r) => r.flow === flow && r.method === method))
const run = (flow: string) => scans.some(({ flows }) => flows.useFlow.includes(flow))
const bindsStep = (flow: string) => scans.some(({ flows }) => flows.boundSteps.includes(flow))

describe("analytics catalogue", () => {
  const { events, properties } = catalogueDefinitions()

  it("describes every event and property in a sentence", () => {
    const bad = [...events, ...properties]
      .filter(
        ({ description }) => description.trim().length < 10 || !description.trim().endsWith(".")
      )
      .map(({ name }) => name)
    expect(
      bad,
      `Write a sentence for: ${bad.join(", ")}. Say what the user did or what the value means.`
    ).toEqual([])
  })

  it("uses every property in an event", () => {
    const used = new Set(events.flatMap(({ properties }) => properties))
    const dead = properties
      .filter(({ name, isSuper }) => !isSuper && !used.has(name))
      .map(({ name }) => name)
    expect(
      dead,
      `No event carries: ${dead.join(", ")}. Delete the property or add it to an event.`
    ).toEqual([])
  })

  it("has a literal event name at every track() call", () => {
    const dynamic = scans.flatMap(({ file, emitters }) =>
      emitters.dynamic.map((line) => `${file}:${line}`)
    )
    expect(
      dynamic,
      `track() needs a string literal event name so liveness can see it:\n${dynamic.join("\n")}`
    ).toEqual([])
  })

  it("sends every event that is not a flow event", () => {
    const flowEvents = new Set(flowList().flatMap((flow) => Object.values(flow.eventNames)))
    const dead = Object.keys(catalogue)
      .filter((name) => !flowEvents.has(name) && !literalEmitters.has(name))
      .map(
        (name) =>
          `Event "${name}" has no emitter. Send it with track("${name}", …) in non-test code, or delete it from the catalogue.`
      )
    expect(dead).toEqual([])
  })

  it("gives an event shared with mobile the properties mobile requires", () => {
    const lacking = Object.entries(MOBILE_SHARED).flatMap(([name, required]) => {
      const def = events.find((event) => event.name === name)
      const missing = required.filter((property) => !def?.properties.includes(property))
      return def && missing.length
        ? [
            `${name} is shared with mobile and lacks ${missing.join(", ")}. Add them to the event, or to the flow's extras or attributes.`,
          ]
        : []
    })
    expect(lacking).toEqual([])
  })

  describe.each(flowList().map((flow) => [flow.name, flow] as const))("flow %s", (name, flow) => {
    it("runs: some component calls useFlow(flows.<name>)", () => {
      expect(
        run(name),
        `Flow "${name}" is never started. Call useFlow(flows.${name}, { … }) in the component or provider that owns its steps.`
      ).toBe(true)
    })

    it("can end: its completing call exists", () => {
      const completes =
        flow.settlement === "transaction"
          ? reported(name, "submitted")
          : reported(name, "completed")
      const how =
        flow.settlement === "transaction"
          ? `flows.${name}.submitted({ …, transactionId }) where the transaction is sent`
          : `flows.${name}.completed(…) where the user finishes it`
      expect(completes, `Flow "${name}" can never complete. Call ${how}.`).toBe(true)
    })

    it("sends every lifecycle event it defines", () => {
      const missing = [
        ...(flow.omit.includes("submitted") || reported(name, "submitted")
          ? []
          : [`flows.${name}.submitted(…)`]),
        ...(flow.omit.includes("failed") || reported(name, "failed")
          ? []
          : [`flows.${name}.failed(cause)`]),
        ...(!flow.steps.some((step) => !step.screen) || bindsStep(name) || reported(name, "step")
          ? []
          : [`useFlow(flows.${name}, { step }) or flows.${name}.step(…)`]),
      ]
      expect(
        missing,
        `Flow "${name}" defines events nothing sends. Add ${missing.join(" and ")}, or list the event in the flow's omit.`
      ).toEqual([])
    })
  })
})
