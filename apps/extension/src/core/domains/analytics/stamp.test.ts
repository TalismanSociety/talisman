import { catalogue } from "@common/analytics/catalogue"
import { describe, expect, it } from "vitest"

import type { Environment } from "./environment"
import { toExceptionEvent } from "./exception"
import { type ParsedEvent, parseTrackedEvent } from "./parse"
import { redactSecrets } from "./redactSecrets"
import { redactProperties, stampEvent } from "./stamp"
import type { AnalyticsState, ExceptionEntry } from "./types"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const EVM_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
const EXTENSION_FRAME = "chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno/background.js"

const ENVIRONMENT: Environment = {
  appVersion: "3.10.1",
  appBuild: "54e646a97",
  appVariant: "development",
  browser: "chrome",
  os: "mac",
  locale: "en-AU",
  $lib: "talisman-extension",
  $lib_version: "3.10.1",
  $app_version: "3.10.1",
  $os: "Mac OS X",
  $browser: "Chrome",
}

const STATE: AnalyticsState = { session: null, appliedConsent: null }

const optIn = () => {
  const result = parseTrackedEvent({
    event: "analytics_opt_in",
    properties: { source: "settings" },
  })
  if (!result.ok) throw new Error("fixture does not parse")
  return result.event
}

describe("redactProperties", () => {
  it("redacts every string, inside arrays too, and leaves other values alone", () => {
    expect(
      redactProperties({
        token_id: `1-evm-erc20-${EVM_ADDRESS}`,
        recipients: [ADDRESS, "polkadot", 3],
        count: 2,
        ok: true,
        none: null,
      })
    ).toEqual({
      token_id: "1-evm-erc20-<hex>",
      recipients: ["<base58>", "polkadot", 3],
      count: 2,
      ok: true,
      none: null,
    })
  })

  it("redacts an exception's type and value but never its frames", () => {
    const exception: ExceptionEntry = {
      type: "Error",
      value: `insufficient funds for ${EVM_ADDRESS}`,
      stacktrace: {
        type: "raw",
        frames: [
          {
            platform: "web:javascript",
            filename: EXTENSION_FRAME,
            function: "send",
            lineno: 1,
            colno: 2,
            in_app: true,
          },
        ],
      },
      mechanism: { handled: true, synthetic: false, type: "caught", exception_id: 0 },
    }

    const [redacted] = redactProperties({ $exception_list: [exception] })
      .$exception_list as ExceptionEntry[]

    expect(redacted.value).toBe("insufficient funds for <hex>")
    expect(redacted.stacktrace?.frames[0].filename).toBe(EXTENSION_FRAME)
  })
})

describe("stampEvent", () => {
  const stamp = (event: ParsedEvent = optIn(), state = STATE) =>
    stampEvent({
      event,
      uiContext: "dashboard",
      environment: ENVIRONMENT,
      state,
      realNow: Date.UTC(2026, 9, 2, 12),
      drawOffset: () => 6 * 60_000,
    })

  it("builds the wire event with super properties, the session as its id and a shifted timestamp", () => {
    const { record, state } = stamp()
    const at = Date.UTC(2026, 9, 2, 12) + 6 * 60_000

    expect(record.sendAt).toBe(at)
    expect(record.kind).toBe("usage")
    expect(record.wire).toEqual({
      event: "analytics_opt_in",
      distinct_id: state.session?.id,
      timestamp: new Date(at).toISOString(),
      uuid: record.uuid,
      properties: {
        ...ENVIRONMENT,
        ui_context: "dashboard",
        source: "settings",
        $session_id: state.session?.id,
        $process_person_profile: false,
      },
    })
  })

  it("stamps the page's screen as $screen_name, and $screen keeps its own", () => {
    const parsed = (raw: unknown) => {
      const result = parseTrackedEvent(raw)
      if (!result.ok) throw new Error("fixture does not parse")
      return result.event
    }

    const modal = stamp(
      parsed({ event: "modal_opened", properties: { modal_id: "swap" }, screen: "/portfolio" })
    )
    const screen = stamp(
      parsed({
        event: "$screen",
        properties: { $screen_name: "/earn", previous_screen_name: "/portfolio" },
        screen: "/portfolio",
      })
    )

    expect(modal.record.wire.properties.$screen_name).toBe("/portfolio")
    expect(screen.record.wire.properties.$screen_name).toBe("/earn")
  })

  it("lets no event property override $session_id or $process_person_profile", () => {
    const event = {
      ...optIn(),
      properties: { source: "settings", $session_id: "spoofed", $process_person_profile: true },
    } as unknown as ParsedEvent

    const { record, state } = stamp(event)

    expect(record.wire.properties.$session_id).toBe(state.session?.id)
    expect(record.wire.properties.$process_person_profile).toBe(false)
  })

  it("events of one session share its id, and the next session has another", () => {
    const first = stamp()
    const second = stamp(optIn(), first.state)
    const afterReset = stamp(optIn(), { ...second.state, session: null })

    expect(second.record.wire.distinct_id).toBe(first.record.wire.distinct_id)
    expect(afterReset.record.wire.distinct_id).not.toBe(first.record.wire.distinct_id)
  })

  it("an unlinked event has an id of its own, no session and leaves the running session alone", () => {
    const running = stamp().state
    const unlinked = { ...optIn(), unlinked: true } as ParsedEvent

    const { record, state } = stamp(unlinked, running)

    expect(record.wire.distinct_id).toBe(record.uuid)
    expect(record.wire.distinct_id).not.toBe(running.session?.id)
    expect(record.wire.properties).not.toHaveProperty("$session_id")
    expect(record.sendAt).toBe(Date.UTC(2026, 9, 2, 12) + 6 * 60_000)
    expect(state).toBe(running)
  })

  it("the holdings snapshot is unlinked", () => {
    expect(catalogue.tvl_snapshot.unlinked).toBe(true)
  })

  it("an error event has an id of its own, real time and no session", () => {
    const { record, state } = stamp({ ...optIn(), kind: "error" })

    expect(record.wire.distinct_id).toBe(record.uuid)
    expect(record.sendAt).toBe(Date.UTC(2026, 9, 2, 12))
    expect(record.wire.properties).not.toHaveProperty("$session_id")
    expect(state.session).toBeNull()
  })

  it("an exception keeps the uuid its realm minted, as its only id, in real time, without a session", () => {
    const uuid = "6f1c2b9e-3a4d-4e5f-8a7b-9c0d1e2f3a4b"
    const result = toExceptionEvent(
      {
        id: uuid,
        mechanism: "caught",
        exceptions: [
          { type: "Error", value: "boom", mechanism: { type: "caught", exception_id: 0 } },
        ],
      },
      { extensionOrigin: EXTENSION_FRAME }
    )
    if (!result.ok) throw new Error("fixture filtered")

    const { record, state } = stamp(result.event)

    expect(record.uuid).toBe(uuid)
    expect(record.wire).toMatchObject({ uuid, distinct_id: uuid, event: "$exception" })
    expect(record.sendAt).toBe(Date.UTC(2026, 9, 2, 12))
    expect(record.wire.properties).not.toHaveProperty("$session_id")
    expect(record.wire.properties).not.toHaveProperty("$release_id")
    expect(state.session).toBeNull()
  })

  it("stores no string that redactSecrets would change", () => {
    const event = {
      ...optIn(),
      properties: { source: `seed ${ADDRESS}` },
    } as unknown as ParsedEvent
    const { record } = stamp(event)

    for (const value of Object.values(record.wire.properties))
      if (typeof value === "string") expect(redactSecrets(value)).toBe(value)
    expect(record.wire.properties.source).toBe("seed <base58>")
  })
})
