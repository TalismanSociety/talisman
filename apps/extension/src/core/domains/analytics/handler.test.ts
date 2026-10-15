import type { EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import { describe, expect, it, vi } from "vitest"

import type { ExtensionStore } from "../../handlers/stores"
import type { Port } from "../../types/base"
import type { CaptureInput } from "./engine"
import { AnalyticsHandler } from "./handler"
import type { Disposition } from "./types"

const capture = vi.hoisted(() =>
  vi.fn<(input: CaptureInput) => Promise<Disposition>>(async () => "queued")
)
vi.mock("./engine", () => ({ analyticsEngine: { capture } }))

const fakePort = () => {
  const listeners: (() => void)[] = []
  const port = {
    sender: { url: "chrome-extension://id/popup.html" },
    onDisconnect: { addListener: (listener: () => void) => listeners.push(listener) },
  }
  return {
    port: port as unknown as Port,
    disconnect: () => {
      for (const listener of listeners) listener()
    },
  }
}

const captured = () =>
  capture.mock.calls.map(([{ result }]) =>
    result.ok ? result.event.name : `rejected:${result.name}`
  )

describe("AnalyticsHandler pri(analytics.track)", () => {
  it("sends no page_closed abandonment when the page closes right after completing a flow", async () => {
    const handler = new AnalyticsHandler({} as ExtensionStore)
    const { port, disconnect } = fakePort()
    const track = (event: EventName, properties: EventProperties) =>
      handler.handle("1", "pri(analytics.track)", { event, properties }, port)

    await track("wallet_reset_started", { flow_id: "r" })
    const completed = track("wallet_reset_completed", { flow_id: "r", duration_ms: 1 })
    disconnect()
    await completed

    expect(captured()).toEqual(["wallet_reset_started", "wallet_reset_completed"])
  })
})
