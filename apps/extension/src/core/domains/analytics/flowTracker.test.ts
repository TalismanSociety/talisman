import type { EventProperties } from "@common/analytics/schema"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Port } from "../../types/base"
import {
  createFlowLinks,
  type FlowLinkRecord,
  type FlowSend,
  FlowTracker,
  type LinkStorage,
} from "./flowTracker"
import { type ParsedCatalogueEvent, parseTrackedEvent } from "./parse"

vi.mock("./engine", () => ({ analyticsEngine: {} }))

vi.mock("@common/analytics/flow/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@common/analytics/flow/registry")>()
  const { defineFlow, flowRegistry } = await import("@common/analytics/flow/defineFlow")
  const transfer = defineFlow("transfer", {
    subject: "sending a transfer",
    steps: ["form", { name: "review", screen: "/transfer/review" }],
    settlement: "transaction",
  })
  const FLOWS = flowRegistry(...actual.flowList(), transfer)
  const transferRef = (event: string) => {
    const lifecycle = Object.entries(transfer.eventNames).find(([, name]) => name === event)?.[0]
    return lifecycle ? { flow: transfer, lifecycle: lifecycle as "started" } : null
  }
  return {
    ...actual,
    FLOWS,
    flowList: () => Object.values(FLOWS),
    flowEventRef: (event: string) => actual.flowEventRef(event) ?? transferRef(event),
  }
})

const fakePort = () => {
  const listeners: (() => void)[] = []
  const port = { onDisconnect: { addListener: (listener: () => void) => listeners.push(listener) } }
  return {
    port: port as unknown as Port,
    disconnect: () => {
      for (const listener of listeners) listener()
    },
  }
}

const parsed = (event: string, properties: EventProperties, envelope: object = {}) => {
  const result = parseTrackedEvent({ event, properties, ...envelope })
  if (!result.ok) throw new Error(`${event}: ${result.issues.join(", ")}`)
  return result.event
}

const memoryStorage = (): LinkStorage & { records: FlowLinkRecord[] } => {
  const storage = {
    records: [] as FlowLinkRecord[],
    read: async () => storage.records,
    write: async (records: readonly FlowLinkRecord[]) => {
      storage.records = [...records]
    },
  }
  return storage
}

const PILOT = "recovery_phrase_backup"

describe("FlowTracker", () => {
  let storage: ReturnType<typeof memoryStorage>
  let send: ReturnType<typeof vi.fn<FlowSend>>
  let tracker: FlowTracker
  const sent = () => send.mock.calls.map(([event, properties]) => ({ event, properties }))

  beforeEach(() => {
    vi.useFakeTimers({ now: 50_000 })
    storage = memoryStorage()
    send = vi.fn<FlowSend>()
    tracker = new FlowTracker({ send, links: createFlowLinks(storage) })
  })

  const observe = (port: Port, event: ParsedCatalogueEvent, now = Date.now()) =>
    tracker.observe(port, "dashboard", event, now)

  it("sends abandoned page_closed with the last step when the page closes mid-flow, once", () => {
    const { port, disconnect } = fakePort()
    observe(port, parsed(`${PILOT}_started`, { flow_id: "a", entry: "settings" }), 10_000)
    observe(port, parsed(`${PILOT}_step_viewed`, { flow_id: "a", step: "show", duration_ms: 5 }))
    observe(
      port,
      parsed("error_shown", {
        surface: "field",
        error_category: "wrong_password",
        flow: PILOT,
        flow_id: "a",
      })
    )

    disconnect()
    disconnect()

    expect(sent()).toEqual([
      {
        event: `${PILOT}_abandoned`,
        properties: {
          flow_id: "a",
          last_step: "show",
          duration_ms: 40_000,
          abandon_cause: "page_closed",
          error_category: "wrong_password",
        },
      },
    ])
  })

  it("sends nothing on page close for an attempt the page already ended", () => {
    const { port, disconnect } = fakePort()
    observe(port, parsed(`${PILOT}_started`, { flow_id: "a", entry: "settings" }))
    observe(
      port,
      parsed(`${PILOT}_abandoned`, { flow_id: "a", duration_ms: 1, abandon_cause: "left" })
    )
    observe(port, parsed(`${PILOT}_started`, { flow_id: "b", entry: "settings" }))
    observe(port, parsed(`${PILOT}_completed`, { flow_id: "b", duration_ms: 1, verified: true }))

    disconnect()

    expect(send).not.toHaveBeenCalled()
  })

  it("ignores events for an attempt it never saw start", () => {
    const { port, disconnect } = fakePort()
    observe(port, parsed(`${PILOT}_step_viewed`, { flow_id: "lost", step: "show", duration_ms: 5 }))

    disconnect()

    expect(send).not.toHaveBeenCalled()
  })

  it("keeps a screen-backed last step current from the page's $screen events", () => {
    const { port, disconnect } = fakePort()
    observe(port, parsed("transfer_started", { flow_id: "t" }))
    observe(port, parsed("$screen", { $screen_name: "/transfer/review" }))

    disconnect()

    expect(sent()[0].properties).toMatchObject({
      last_step: "review",
      abandon_cause: "page_closed",
    })
  })

  it("keeps at most 16 open attempts per page, dropping the oldest", () => {
    const { port, disconnect } = fakePort()
    for (let i = 0; i < 17; i++)
      observe(port, parsed(`${PILOT}_started`, { flow_id: `f${i}`, entry: "settings" }))

    disconnect()

    expect(sent().map(({ properties }) => properties.flow_id)).toEqual(
      Array.from({ length: 16 }, (_, i) => `f${i + 1}`)
    )
  })

  it("completes a transaction flow when its transaction settles, after the page closed, once", async () => {
    const { port, disconnect } = fakePort()
    observe(port, parsed("transfer_started", { flow_id: "t" }), 10_000)
    observe(
      port,
      parsed("transfer_submitted", { flow_id: "t", duration_ms: 5 }, { transactionId: "0xabc" })
    )
    disconnect()
    await vi.waitFor(() => expect(storage.records).toHaveLength(1))

    await tracker.settled("0xdef", { status: "success", timeToSettleMs: 1 }, 60_000)
    await tracker.settled("0xabc", { status: "error", timeToSettleMs: 900 }, 60_000)
    await tracker.settled("0xabc", { status: "error", timeToSettleMs: 900 }, 60_000)

    expect(sent()).toEqual([
      {
        event: "transfer_completed",
        properties: { flow_id: "t", duration_ms: 50_000, status: "error", time_to_settle_ms: 900 },
      },
    ])
  })

  it("completes a transaction flow whose transaction settled before the page linked it", async () => {
    const { port } = fakePort()
    observe(port, parsed("transfer_started", { flow_id: "t" }), 10_000)
    await tracker.settled("0xabc", { status: "success", timeToSettleMs: 300 }, 59_000)
    observe(
      port,
      parsed("transfer_submitted", { flow_id: "t", duration_ms: 5 }, { transactionId: "0xabc" })
    )

    await vi.waitFor(() =>
      expect(sent()).toEqual([
        {
          event: "transfer_completed",
          properties: {
            flow_id: "t",
            duration_ms: 49_000,
            status: "success",
            time_to_settle_ms: 300,
          },
        },
      ])
    )
    expect(storage.records).toEqual([])
  })

  it("finds a linked attempt after a service worker restart", async () => {
    const { port } = fakePort()
    observe(port, parsed("transfer_started", { flow_id: "t" }))
    observe(
      port,
      parsed("transfer_submitted", { flow_id: "t", duration_ms: 5 }, { transactionId: "0xabc" })
    )
    await vi.waitFor(() => expect(storage.records).toHaveLength(1))

    const restarted = new FlowTracker({ send, links: createFlowLinks(storage) })
    await restarted.settled("0xabc", { status: "success", timeToSettleMs: 1 }, 60_000)

    expect(sent().map(({ event }) => event)).toEqual(["transfer_completed"])
  })
})

describe("flow links", () => {
  const slot = (flowId: string) => ({
    uiContext: "popup" as const,
    mirror: {
      flowId,
      flow: { name: "transfer" } as never,
      phase: "submitted" as const,
      step: null,
      lastError: null,
      attributes: {},
      startedAtEpochMs: 0,
      transactionId: flowId,
    },
  })

  const settled = { status: "success", timeToSettleMs: 1 } as const
  const DAY_MS = 24 * 60 * 60_000

  it("keeps the latest 50 and drops links older than 24 hours", async () => {
    const storage = memoryStorage()
    const links = createFlowLinks(storage)
    await links.put("old", slot("old"), 0)
    for (let i = 0; i < 51; i++) await links.put(`t${i}`, slot(`t${i}`), DAY_MS + i)

    expect(storage.records).toHaveLength(50)
    expect(storage.records.map(({ transactionId }) => transactionId)).not.toContain("old")
    expect(storage.records[0].transactionId).toBe("t1")
    expect(await links.take("t0", settled, DAY_MS + 60)).toBeNull()
    expect(await links.take("t50", settled, DAY_MS + 60)).toMatchObject({
      mirror: { flowId: "t50" },
    })
    expect(await links.take("t50", settled, DAY_MS + 60)).toBeNull()
  })

  it("holds a settlement that arrives first for 10 minutes, and no more than 20 of them", async () => {
    const storage = memoryStorage()
    const links = createFlowLinks(storage)
    await links.put("pending", slot("pending"), 0)
    for (let i = 0; i < 21; i++) await links.take(`s${i}`, settled, i)

    expect(await links.put("s0", slot("s0"), 30)).toBeNull()
    expect(await links.put("s1", slot("s1"), 30)).toEqual({ settled, settledAt: 1 })
    expect(await links.put("s20", slot("s20"), 10 * 60_000 + 20)).toBeNull()
    expect(await links.take("pending", settled, 40)).toMatchObject({
      mirror: { flowId: "pending" },
    })
  })

  it("never writes a link concurrently: two puts both land", async () => {
    const storage = memoryStorage()
    const links = createFlowLinks(storage)

    await Promise.all([links.put("a", slot("a"), 1), links.put("b", slot("b"), 1)])

    expect(storage.records.map(({ transactionId }) => transactionId)).toEqual(["a", "b"])
  })
})

describe("the transactionId envelope", () => {
  it("is accepted only on a transaction flow's submitted event", () => {
    const submitted = parseTrackedEvent({
      event: "transfer_submitted",
      properties: { flow_id: "t", duration_ms: 1 },
      transactionId: "0xabc",
    })
    const other = parseTrackedEvent({
      event: `${PILOT}_submitted`,
      properties: { flow_id: "t", duration_ms: 1 },
      transactionId: "0xabc",
    })

    expect(submitted).toMatchObject({ ok: true, event: { transactionId: "0xabc" } })
    expect(other).toEqual({
      ok: false,
      name: `${PILOT}_submitted`,
      issues: ["transaction_id_not_allowed"],
      disposition: "rejected",
    })
  })

  it("never becomes a property", () => {
    const result = parseTrackedEvent({
      event: "transfer_submitted",
      properties: { flow_id: "t", duration_ms: 1 },
      transactionId: "0xabc",
    })

    expect(result.ok && result.event.properties).toEqual({ flow_id: "t", duration_ms: 1 })
  })
})
