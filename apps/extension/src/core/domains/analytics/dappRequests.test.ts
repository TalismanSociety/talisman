import { catalogue, type EventName } from "@common/analytics/catalogue"
import type { RequestOutcome } from "@common/analytics/dapp"
import type { EventProperties } from "@common/analytics/schema"
import { filter, firstValueFrom, type Subscription } from "rxjs"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { type RequestEnding, requestStore } from "../../libs/requests/store"
import { windowManager } from "../../libs/WindowManager"
import { passwordStore } from "../app/store.password"
import {
  createDappRequestTracker,
  type Decision,
  failureCategoryOf,
  outcomeOf,
  verdictOf,
} from "./dappRequests"
import type { RequestDecision } from "./observeMessage"

type TrackedCall = [event: EventName, props?: EventProperties]

const tracked = vi.hoisted(() => {
  const calls: TrackedCall[] = []
  return { calls }
})

vi.mock("./track", () => ({
  track: (...call: TrackedCall) => {
    tracked.calls.push(call)
  },
}))

const popup = vi.hoisted(() => ({ close: () => {} }))

vi.mock("../../libs/WindowManager", () => ({
  windowManager: {
    popupOpen: vi.fn(async (_route: string, onClose: () => void) => {
      popup.close = onClose
      return 1
    }),
    popupClose: vi.fn(async () => {}),
  },
}))

const T0 = Date.UTC(2026, 9, 2, 12)
const DAPP_URL = "https://App.Example.com:8443/swap?ref=secret-ref#pay"

const trackedCalls = () => tracked.calls
const resolvedEvents = () => trackedCalls().filter(([event]) => event === "dapp_request_resolved")

const expectTrackedPropsToParse = () => {
  for (const [event, props] of trackedCalls()) catalogue[event].schema.parse(props ?? {})
}

describe("outcomeOf", () => {
  const decided = (outcome: RequestDecision): Decision => ({ outcome, at: T0 })
  const failed: Decision = { outcome: "failed", at: T0, errorCategory: "ledger_device_locked" }

  const table: [
    RequestEnding,
    ...[none: RequestOutcome, approved: RequestOutcome, rejected: RequestOutcome],
    ...[closed: RequestOutcome, failed: RequestOutcome],
  ][] = [
    ["resolved", "approved", "approved", "approved", "approved", "approved"],
    ["rejected", "rejected", "failed", "rejected", "rejected", "failed"],
    ["window_closed", "closed", "approved", "rejected", "closed", "failed"],
    ["port_disconnected", "expired", "approved", "rejected", "closed", "failed"],
    ["open_failed", "expired", "expired", "expired", "expired", "expired"],
    ["ignored", "closed", "closed", "closed", "closed", "closed"],
  ]

  it.each(table)(
    "%s: undecided %s, approved %s, rejected %s, closed %s, after a failed approval %s",
    (ending, none, approved, rejected, closed, afterFailure) => {
      expect(outcomeOf(ending, undefined)).toBe(none)
      expect(outcomeOf(ending, decided("approved"))).toBe(approved)
      expect(outcomeOf(ending, decided("rejected"))).toBe(rejected)
      expect(outcomeOf(ending, decided("closed"))).toBe(closed)
      expect(outcomeOf(ending, failed)).toBe(afterFailure)
    }
  )
})

describe("failureCategoryOf", () => {
  const approved: Decision = { outcome: "approved", at: T0 }
  const unauthorised = new Error("Unauthorised")

  it("classifies the error that failed an approved request", () => {
    expect(failureCategoryOf("failed", approved, unauthorised)).toBe("wrong_password")
  })

  it("prefers the category recorded when the approval failed", () => {
    const failed: Decision = { outcome: "failed", at: T0, errorCategory: "ledger_device_locked" }
    expect(failureCategoryOf("failed", failed, unauthorised)).toBe("ledger_device_locked")
  })

  it("reads unknown when a failure carries no error", () => {
    expect(failureCategoryOf("failed", approved, undefined)).toBe("unknown")
  })

  it("gives no category to an outcome that is not a failure", () => {
    for (const outcome of ["approved", "rejected", "expired", "closed"] as const)
      expect(failureCategoryOf(outcome, approved, unauthorised)).toBe(undefined)
  })
})

describe("verdictOf", () => {
  it("keeps the popup's verdict over the site verdict", () => {
    expect(verdictOf({ verdict: "benign", siteFlagged: true })).toBe("benign")
  })

  it("falls back to the site verdict", () => {
    expect(verdictOf({ siteFlagged: true })).toBe("malicious")
    expect(verdictOf({ siteFlagged: false })).toBe("unscanned")
  })
})

describe("dapp request tracker on the request store", () => {
  let tracker: ReturnType<typeof createDappRequestTracker>
  let subscription: Subscription

  const openRequest = (port?: chrome.runtime.Port) => {
    const response = requestStore.createRequest(
      {
        type: "auth",
        idStr: "auth-test",
        url: DAPP_URL,
        request: { origin: "Example", provider: "polkadot" },
      },
      port
    )
    response.catch(() => {})
    const created = requestStore.getAllRequests("auth").at(-1)
    if (!created) throw new Error("the request store kept no request")
    const request = requestStore.getRequest(created.id)
    if (!request) throw new Error("the request store kept no respondable request")
    return { id: created.id, request, response }
  }

  beforeAll(async () => {
    await firstValueFrom(passwordStore.isLoggedIn.pipe(filter((state) => state !== "UNKNOWN")))
  })

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(T0)
    tracked.calls.length = 0
    tracker = createDappRequestTracker()
    subscription = requestStore.facts$.subscribe((fact) => tracker.onFact(fact))
  })

  afterEach(() => {
    expectTrackedPropsToParse()
    subscription.unsubscribe()
    requestStore.clearRequests()
    vi.useRealTimers()
  })

  it("reports a resolved request once, whatever ends it later", () => {
    const { id, request } = openRequest()
    tracker.noteDecision(id, "approved", T0)

    request.resolve({ addresses: [] })
    request.resolve({ addresses: [] })
    popup.close()

    expect(resolvedEvents()).toEqual([
      ["dapp_request_resolved", expect.objectContaining({ outcome: "approved" })],
    ])
  })

  it("keeps the approval when the window closes during it, timed to the decision", () => {
    const { id, request } = openRequest()
    tracker.noteDecision(id, "approved", T0 + 500)

    vi.setSystemTime(T0 + 2_000)
    popup.close()
    request.resolve({ addresses: [] })

    expect(resolvedEvents()).toEqual([
      [
        "dapp_request_resolved",
        expect.objectContaining({ outcome: "approved", time_to_decision_ms: 500 }),
      ],
    ])
  })

  it("reports an approval the wallet refused as failed with its category", () => {
    const { id, request } = openRequest()
    tracker.noteDecision(id, "approved", T0)

    request.reject(new Error("Unauthorised"))

    expect(resolvedEvents()).toEqual([
      [
        "dapp_request_resolved",
        expect.objectContaining({ outcome: "failed", error_category: "wrong_password" }),
      ],
    ])
  })

  it("reports a user cancel as rejected without a category", () => {
    const { id, request } = openRequest()
    tracker.noteDecision(id, "rejected", T0)

    request.reject(new Error("Cancelled"))

    const [[, props]] = resolvedEvents()
    expect(props).toMatchObject({ outcome: "rejected" })
    expect(props).not.toHaveProperty("error_category")
  })

  it("reports a failed approval followed by a window close as failed with the failure's category", () => {
    const { id } = openRequest()
    tracker.noteDecision(id, "approved", T0)
    tracker.noteApprovalFailure(id, "ledger_device_locked")

    popup.close()

    expect(resolvedEvents()).toEqual([
      [
        "dapp_request_resolved",
        expect.objectContaining({ outcome: "failed", error_category: "ledger_device_locked" }),
      ],
    ])
  })

  it("reports a failed approval the user then cancels as rejected", () => {
    const { id, request } = openRequest()
    tracker.noteDecision(id, "approved", T0)
    tracker.noteApprovalFailure(id, "ledger_device_locked")
    tracker.noteDecision(id, "rejected", T0 + 1_000)

    request.reject(new Error("Cancelled"))

    const [[, props]] = resolvedEvents()
    expect(props).toMatchObject({ outcome: "rejected" })
    expect(props).not.toHaveProperty("error_category")
  })

  it("reports a failed approval that a retry completes as approved", () => {
    const { id, request } = openRequest()
    tracker.noteDecision(id, "approved", T0)
    tracker.noteApprovalFailure(id, "ledger_device_locked")
    tracker.noteDecision(id, "approved", T0 + 1_000)

    request.resolve({ addresses: [] })

    const [[, props]] = resolvedEvents()
    expect(props).toMatchObject({ outcome: "approved" })
    expect(props).not.toHaveProperty("error_category")
  })

  it("reports an undecided request whose tab disconnected as expired", () => {
    const port = chrome.runtime.connect()
    openRequest(port)

    port.disconnect()

    expect(resolvedEvents()).toEqual([
      ["dapp_request_resolved", expect.objectContaining({ outcome: "expired" })],
    ])
  })

  it("reports an ignored request as closed", () => {
    const { id } = openRequest()

    requestStore.deleteRequest(id)

    expect(resolvedEvents()).toEqual([
      ["dapp_request_resolved", expect.objectContaining({ outcome: "closed" })],
    ])
  })

  it("reports a request whose window failed to open as expired, and forgets it", async () => {
    vi.mocked(windowManager.popupOpen).mockRejectedValueOnce(new Error("No window"))
    const { id, response } = openRequest()

    await expect(response).rejects.toThrow("No window")

    expect(requestStore.getRequest(id)).toBeUndefined()
    expect(resolvedEvents()).toEqual([
      ["dapp_request_resolved", expect.objectContaining({ outcome: "expired" })],
    ])
  })

  it("receives a request with the lock state, its request type and the dapp's domain, never its url", () => {
    passwordStore.isLoggedIn.next("TRUE")
    openRequest()
    passwordStore.isLoggedIn.next("FALSE")
    openRequest()

    const received = trackedCalls().filter(([event]) => event === "dapp_request_received")
    const dapp = { request_type: "connect", dapp_domain: "app.example.com" }
    expect(received).toEqual([
      ["dapp_request_received", expect.objectContaining({ ...dapp, wallet_locked: false })],
      ["dapp_request_received", expect.objectContaining({ ...dapp, wallet_locked: true })],
    ])
    expect(JSON.stringify(trackedCalls())).not.toMatch(/swap|secret-ref|8443|pay/)
  })

  it("ends a request with its request type and the dapp's domain", () => {
    const { id } = openRequest()

    requestStore.deleteRequest(id)

    expect(resolvedEvents()).toEqual([
      [
        "dapp_request_resolved",
        expect.objectContaining({ request_type: "connect", dapp_domain: "app.example.com" }),
      ],
    ])
  })

  it("reports the risk verdict the popup noted, else unscanned", () => {
    const scanned = openRequest()
    tracker.noteRisk(scanned.id, "warning")
    requestStore.deleteRequest(scanned.id)

    const unscanned = openRequest()
    requestStore.deleteRequest(unscanned.id)

    expect(resolvedEvents()).toEqual([
      ["dapp_request_resolved", expect.objectContaining({ risk_verdict: "warning" })],
      ["dapp_request_resolved", expect.objectContaining({ risk_verdict: "unscanned" })],
    ])
  })
})
