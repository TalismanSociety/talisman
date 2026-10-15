import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CaptureInput } from "./engine"
import type { Disposition } from "./types"

const captured = vi.hoisted(() => [] as CaptureInput[])
const networkLookups = vi.hoisted(() => [] as unknown[])

vi.mock("./engine", () => ({
  analyticsEngine: {
    capture: async (input: CaptureInput): Promise<Disposition> => {
      captured.push(input)
      return input.result.ok ? "queued" : input.result.disposition
    },
  },
}))
vi.mock("./txContext", () => ({
  analyticsNetworkId: async (network: unknown) => {
    networkLookups.push(network)
    return "custom"
  },
}))

const { receiveException, reportError } = await import("./errorReporting")

const last = () => captured[captured.length - 1].result

beforeEach(() => {
  captured.length = 0
  networkLookups.length = 0
  vi.stubGlobal("chrome", {
    runtime: { getURL: (path: string) => `chrome-extension://id/${path}` },
  })
})

describe("reportError (worker)", () => {
  it("resolves to the event id the event was queued with", async () => {
    const id = await reportError(new Error(`worker ${Math.random()}`))
    const result = last()
    expect(result.ok && result.event.uuid).toBe(id)
    expect(captured[0].uiContext).toBe("background")
  })

  it("filters the fourth occurrence of one error and resolves null", async () => {
    const error = new Error(`loop ${Math.random()}`)
    const ids = [await reportError(error), await reportError(error), await reportError(error)]
    expect(ids.every((id) => id !== null)).toBe(true)

    expect(await reportError(error)).toBeNull()
    expect(last()).toMatchObject({ ok: false, issues: ["throttled"], disposition: "filtered" })
  })

  it("looks up the network of admitted reports only", async () => {
    const error = new Error(`network ${Math.random()}`)
    for (let i = 0; i < 4; i++) await reportError(error, { networkId: "my-custom-chain" })

    expect(networkLookups).toEqual(Array(3).fill({ networkId: "my-custom-chain" }))
    const admitted = captured[2].result
    expect(admitted.ok && admitted.event.properties.network_id).toBe("custom")
  })

  it("filters an ignored error before the throttle counts it", async () => {
    expect(await reportError(new Error("No window with id: 12"))).toBeNull()
    expect(last()).toMatchObject({ issues: ["ignored:window_closed"], disposition: "filtered" })
  })
})

describe("receiveException", () => {
  it("rejects a malformed report from a page", async () => {
    expect(await receiveException({ id: "x", exceptions: [] }, "dashboard")).toBe("rejected")
    expect(last()).toMatchObject({ ok: false, name: "$exception", disposition: "rejected" })
  })
})
