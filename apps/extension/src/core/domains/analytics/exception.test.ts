import { buildExceptionReport } from "@common/analytics/exceptionReport"
import { describe, expect, it } from "vitest"

import {
  createExceptionThrottle,
  IGNORED_ERRORS,
  type IgnoredError,
  ignoredBy,
  markFrames,
  type ParsedExceptionReport,
  parseExceptionReport,
  toExceptionEvent,
  withNetworkId,
} from "./exception"

const ORIGIN = "chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno/"
const ID = "6f1c2b9e-3a4d-4e5f-8a7b-9c0d1e2f3a4b"

const report = (overrides: Partial<ParsedExceptionReport> = {}): ParsedExceptionReport => ({
  id: ID,
  mechanism: "uncaught",
  exceptions: [
    {
      type: "Error",
      value: "failed for 0xdeadbeef",
      mechanism: { type: "uncaught", handled: false, exception_id: 0 },
      stacktrace: {
        type: "raw",
        frames: [
          { platform: "web:javascript", filename: `${ORIGIN}background.js`, lineno: 1, colno: 9 },
        ],
      },
    },
  ],
  ...overrides,
})

const event = (input = report()) => {
  const result = toExceptionEvent(input, { extensionOrigin: ORIGIN })
  if (!result.ok) throw new Error(`fixture filtered: ${result.issues}`)
  return result
}

describe("parseExceptionReport", () => {
  it("accepts every report the builder makes, hostile and oversized inputs included", () => {
    const cyclic: Error & { cause?: unknown } = new Error("loop")
    cyclic.cause = cyclic
    const hostile = {
      get message(): string {
        throw new Error("getter")
      },
    }
    const inputs = [
      new Error("plain"),
      new Error("outer", { cause: new TypeError("inner") }),
      "a thrown string",
      42,
      null,
      cyclic,
      hostile,
      new Error("x".repeat(10_000)),
      new AggregateError(Array.from({ length: 30 }, (_, i) => new Error(`member ${i}`))),
    ]
    for (const input of inputs) {
      const built = buildExceptionReport(input, { screen: "/portfolio" })
      expect(parseExceptionReport(built).ok, String(input)).toBe(true)
    }
  })

  it("strips frame keys outside the schema, such as a page's own in_app", () => {
    const raw = report()
    const frame = { ...raw.exceptions[0].stacktrace?.frames[0], in_app: true, vars: { pw: "x" } }
    const parsed = parseExceptionReport({
      ...raw,
      exceptions: [{ ...raw.exceptions[0], stacktrace: { type: "raw", frames: [frame] } }],
    })
    if (!parsed.ok) throw new Error("did not parse")
    expect(parsed.report.exceptions[0].stacktrace?.frames[0]).not.toHaveProperty("vars")
    expect(parsed.report.exceptions[0].stacktrace?.frames[0]).not.toHaveProperty("in_app")
  })

  it.each([
    ["no uuid", { id: "not-a-uuid" }],
    ["an unknown mechanism", { mechanism: "telepathy" }],
    ["too many entries", { exceptions: Array(11).fill(report().exceptions[0]) }],
    ["an extra key", { url: "https://dapp.example" }],
  ])("rejects a report with %s", (_, overrides) => {
    expect(parseExceptionReport({ ...report(), ...overrides })).toMatchObject({
      ok: false,
      disposition: "rejected",
    })
  })
})

describe("ignoredBy", () => {
  it.each([
    ["window_closed", "No window with id: 123", "No window id"],
    [
      "ws_normal_closure",
      "disconnected from wss://rpc.polkadot.io: 1000:: Normal Closure",
      "disconnected from wss://rpc.polkadot.io: Normal Closure",
    ],
    ["ws_disconnected", "disconnected from ws://x: 1006:: Abnormal", "disconnected from ws://x"],
    ["ws_unsubscribed", "unsubscribed from ws://x: 1006:: Gone", "unsubscribed from ws://x"],
    [
      "no_receiving_end",
      "Could not establish connection. Receiving end does not exist.",
      "Could not establish connection.",
    ],
    [
      "media_track_capabilities",
      "track.getCapabilities is not a function",
      "track is not a function",
    ],
  ] satisfies [IgnoredError, string, string][])(
    "%s matches and its near miss does not",
    (key, hit, miss) => {
      expect(ignoredBy({ type: "Error", value: hit })).toBe(key)
      expect(ignoredBy({ type: "Error", value: miss })).toBeNull()
    }
  )

  it("lists one pattern per key", () => {
    expect(Object.keys(IGNORED_ERRORS)).toHaveLength(6)
  })
})

describe("markFrames", () => {
  it("marks the extension's own frames in-app and every other frame not", () => {
    const frames = markFrames(
      [
        { platform: "web:javascript", filename: `${ORIGIN}chunks/dashboard.js` },
        { platform: "web:javascript", filename: "https://dapp.example/app.js" },
        { platform: "web:javascript", filename: "<anonymous>" },
        { platform: "web:javascript", filename: "native" },
        { platform: "web:javascript" },
      ],
      ORIGIN
    )
    expect(frames.map((frame) => frame.in_app)).toEqual([true, false, false, false, false])
  })

  it("replaces a Firefox install's origin and keeps the chunk id", () => {
    const origin = "moz-extension://0d6a4b37-1d2e-4c8f-9a5b-7e6f5d4c3b2a/"
    const [frame] = markFrames(
      [{ platform: "web:javascript", filename: `${origin}background.js`, chunk_id: "c1" }],
      origin
    )
    expect(frame).toEqual({
      platform: "web:javascript",
      filename: "moz-extension://talisman/background.js",
      chunk_id: "c1",
      in_app: true,
    })
  })
})

describe("toExceptionEvent", () => {
  it("fingerprints the scrubbed root, scrubs chained entries and keeps the report id", () => {
    const input = report()
    const chained = {
      type: "TypeError",
      value: "for 5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ",
      mechanism: { type: "chained", source: "cause" as const, exception_id: 1, parent_id: 0 },
    }
    const { event: parsed } = event({ ...input, exceptions: [...input.exceptions, chained] })

    expect(parsed).toMatchObject({ name: "$exception", kind: "error", uuid: ID })
    expect(parsed.properties).toMatchObject({
      $exception_fingerprint: "Error: failed for <hex>",
      $exception_level: "error",
      exception_type: "Error",
      mechanism: "uncaught",
      handled: false,
    })
    expect(parsed.properties.$exception_list.map((entry) => entry.value)).toEqual([
      "failed for <hex>",
      "for <base58>",
    ])
    expect(parsed.properties.$exception_list[0].stacktrace?.frames[0].in_app).toBe(true)
    expect(parsed.properties).not.toHaveProperty("network_id")
  })

  it("filters an ignored error", () => {
    const input = report()
    const result = toExceptionEvent(
      { ...input, exceptions: [{ ...input.exceptions[0], value: "No window with id: 7" }] },
      { extensionOrigin: ORIGIN }
    )
    expect(result).toEqual({
      ok: false,
      name: "$exception",
      issues: ["ignored:window_closed"],
      disposition: "filtered",
    })
  })

  it("keeps a valid screen and drops an invalid one with an issue", () => {
    expect(event(report({ screen: "/portfolio/tokens/:symbol" })).event.screen).toBe(
      "/portfolio/tokens/:symbol"
    )
    const invalid = event(report({ screen: "/portfolio/0xdeadbeef" }))
    expect(invalid.event.screen).toBeUndefined()
    expect(invalid.issues).toEqual(["screen: invalid_format"])
  })

  it("withNetworkId adds network_id", () => {
    expect(withNetworkId(event().event, "polkadot").properties.network_id).toBe("polkadot")
  })
})

describe("createExceptionThrottle", () => {
  const LIMITS = { windowMs: 1_000, perFingerprint: 3, total: 5 }

  it("refuses the fourth occurrence of a fingerprint in a window", () => {
    const throttle = createExceptionThrottle(LIMITS)
    expect([1, 2, 3, 4].map(() => throttle.admit("a", 0))).toEqual([true, true, true, false])
  })

  it("counts admitted occurrences only, so a looping error leaves room for others", () => {
    const throttle = createExceptionThrottle(LIMITS)
    for (let i = 0; i < 50; i++) throttle.admit("loop", 0)
    expect(throttle.admit("b", 0)).toBe(true)
    expect(throttle.admit("c", 0)).toBe(true)
    expect(throttle.admit("d", 0)).toBe(false)
  })

  it("starts over in a new window", () => {
    const throttle = createExceptionThrottle(LIMITS)
    for (let i = 0; i < 3; i++) throttle.admit("a", 0)
    expect(throttle.admit("a", 999)).toBe(false)
    expect(throttle.admit("a", 1_000)).toBe(true)
  })
})
