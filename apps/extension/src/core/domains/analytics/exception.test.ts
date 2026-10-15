import { buildExceptionReport } from "@common/analytics/exceptionReport"
import { describe, expect, it } from "vitest"

import {
  createExceptionThrottle,
  errorClassOf,
  IGNORED_ERRORS,
  type IgnoredError,
  ignoredBy,
  ownFrames,
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
  category: "unknown",
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

describe("ownFrames", () => {
  const frame = (filename: string | undefined, name?: string) => ({
    platform: "web:javascript" as const,
    ...(filename !== undefined && { filename }),
    ...(name !== undefined && { function: name }),
    lineno: 3,
    colno: 7,
  })

  it("keeps the extension's own scripts with their positions, in-app", () => {
    expect(
      ownFrames(
        [{ ...frame(`${ORIGIN}chunks/dashboard-B1a_2c.js`, "send"), chunk_id: "c-1" }],
        ORIGIN
      )
    ).toEqual([
      {
        platform: "web:javascript",
        filename: `${ORIGIN}chunks/dashboard-B1a_2c.js`,
        function: "send",
        lineno: 3,
        colno: 7,
        chunk_id: "c-1",
        in_app: true,
      },
    ])
  })

  it("keeps a native frame as its function name alone", () => {
    expect(
      ownFrames([frame("<anonymous>", "JSON.parse"), frame(undefined, "new Promise")], ORIGIN)
    ).toEqual([
      { platform: "web:javascript", function: "JSON.parse", in_app: false },
      { platform: "web:javascript", function: "new Promise", in_app: false },
    ])
  })

  it.each([
    [
      "an RPC URL a message line was read as",
      "https://eth-mainnet.g.alchemy.com/v2/AbCdEfGhIjKlMnOp-12345",
      "URL: ",
    ],
    ["a websocket RPC URL", "wss://rpc.kevin-smith.dev/ws/key-123", "URL: "],
    ["a dapp's script", "https://dapp.example/app.js", "connect"],
    ["a local file", "file:///Users/alice/secret/project/foo.js", "run"],
    [
      "another extension",
      "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/background.js",
      "run",
    ],
    [
      "a page of the extension with a route",
      `${ORIGIN}dashboard.html#/accounts/kevin.eth?address=bc1q`,
      "run",
    ],
    ["a script with a query", `${ORIGIN}background.js?user=kevin`, "run"],
    ["a native frame whose name is text", "<anonymous>", "Kevin Ledger Savings"],
  ])("drops %s", (_label, filename, name) => {
    expect(ownFrames([frame(filename, name)], ORIGIN)).toEqual([])
  })

  it.each([
    ["text", "need 4200 USDC, have 3100"],
    ["an address", "sign_5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"],
    ["a call with arguments", "Promise.all (index 0)"],
  ])("keeps an own frame's position without a function name that is %s", (_label, name) => {
    const [kept] = ownFrames([frame(`${ORIGIN}background.js`, name)], ORIGIN)

    expect(kept).not.toHaveProperty("function")
    expect(kept).toMatchObject({ filename: `${ORIGIN}background.js`, lineno: 3, colno: 7 })
  })

  it("drops a chunk id that is not an id", () => {
    const [kept] = ownFrames(
      [{ ...frame(`${ORIGIN}background.js`), chunk_id: "kevin savings" }],
      ORIGIN
    )

    expect(kept).not.toHaveProperty("chunk_id")
  })
})

describe("errorClassOf", () => {
  it.each([
    ["Error", "Error"],
    ["TypeError", "TypeError"],
    ["HttpRequestError", "HttpRequestError"],
    ["DOMException", "DOMException"],
    ["DisconnectedDevice", "DisconnectedDevice"],
    ["React ErrorBoundary TypeError", "React ErrorBoundary TypeError"],
    ["Kevin Savings", "Error"],
    ["React ErrorBoundary Kevin Savings", "React ErrorBoundary Error"],
    ["Invalid 5GrwvaEF5zXb26Fz9rcQ", "Error"],
    ["HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F", "Error"],
    ["React ErrorBoundary https://evil.example/path?u=bob", "React ErrorBoundary Error"],
    ["vitalik.eth", "Error"],
    ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "Error"],
  ])("%s -> %s", (type, expected) => {
    expect(errorClassOf({ type })).toBe(expected)
  })

  it("never trusts the name of a thrown value that is not an error", () => {
    expect(errorClassOf({ type: "Savings", synthetic: true })).toBe("Error")
  })
})

describe("toExceptionEvent", () => {
  it("sends the class, the category and the code positions, and no text of the message", () => {
    const input = report({ category: "rpc" })
    const chained = {
      type: "TypeError",
      value: "for 5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ",
      mechanism: { type: "chained", source: "cause" as const, exception_id: 1, parent_id: 0 },
    }
    const { event: parsed } = event({ ...input, exceptions: [...input.exceptions, chained] })

    expect(parsed).toMatchObject({ name: "$exception", kind: "error", uuid: ID })
    expect(parsed.properties).toMatchObject({
      $exception_level: "error",
      exception_type: "Error",
      error_category: "rpc",
      mechanism: "uncaught",
      handled: false,
    })
    expect(parsed.properties).not.toHaveProperty("$exception_fingerprint")
    expect(parsed.properties.$exception_list.map(({ type, value }) => [type, value])).toEqual([
      ["Error", "rpc"],
      ["TypeError", ""],
    ])
    expect(parsed.properties.$exception_list.map((entry) => entry.mechanism.type)).toEqual([
      "uncaught",
      "chained",
    ])
    expect(parsed.properties.$exception_list[0].stacktrace?.frames[0].in_app).toBe(true)
    expect(parsed.properties).not.toHaveProperty("network_id")
  })

  it.each([
    [
      "a network the user named",
      new Error("No client for network 987654 (Bob Smith Private Chain)"),
      ["987654", "Bob", "Smith", "Private Chain"],
    ],
    [
      "an account name, an ENS name and an amount",
      new Error('Account "Kevin Ledger Savings" of vitalik.eth needs 4200 USDC'),
      ["Kevin", "Savings", "vitalik", "4200"],
    ],
    [
      "addresses of every kind",
      new Error(
        "balances_5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq 0Xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
      ),
      ["5Grwva", "bc1q", "d8dA6B"],
    ],
    [
      "a recovery phrase with separators and a derivation password",
      new Error(
        "legal-winner-thank-year-wave-sausage-worth-useful-legal-winner-thank-yellow//hard///hunter2pass"
      ),
      ["legal", "sausage", "hunter2pass"],
    ],
    [
      "an RPC URL with its key, on every line of the message",
      new Error(
        'HTTP request failed.\n\nURL: https://eth-mainnet.g.alchemy.com/v2/AbCdEfGhIjKlMnOp-12345\nRequest body: {"from":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}\n    at wss://rpc.kevin-smith.dev/ws/key-123'
      ),
      ["alchemy", "AbCdEf", "kevin-smith", "key-123", "d8dA6B"],
    ],
    [
      "a thrown object's own name and keys",
      {
        name: "Kevin Savings",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        "vitalik.eth": 1,
      },
      ["Kevin", "Savings", "vitalik", "d8dA6B", "address"],
    ],
    ["a thrown string", "seed: legal winner thank year wave sausage", ["legal", "sausage", "seed"]],
  ])("sends nothing of %s", (_label, thrown, secrets) => {
    const parsed = parseExceptionReport(buildExceptionReport(thrown, { mechanism: "uncaught" }))
    if (!parsed.ok) throw new Error("did not parse")

    const wire = JSON.stringify(event(parsed.report).event.properties)

    for (const secret of secrets) expect(wire).not.toContain(secret)
  })

  it("keeps the raw message for the throttle only, so one error is still counted as one", () => {
    const first = event(report())
    const other = event(
      report({ exceptions: [{ ...report().exceptions[0], value: "another failure" }] })
    )

    expect(first.throttleKey).toBe("Error: failed for 0xdeadbeef")
    expect(other.throttleKey).not.toBe(first.throttleKey)
    expect(JSON.stringify(first.event)).not.toContain("deadbeef")
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
  const LIMITS = { windowMs: 1_000, perKey: 3, total: 5 }

  it("refuses the fourth occurrence of an error in a window", () => {
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
