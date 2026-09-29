import { afterEach, describe, expect, it, vi } from "vitest"

import { createEsploraClient } from "./client"

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createEsploraClient", () => {
  it("fails over to the next url on server errors and sticks to it", async () => {
    const calls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url)
        if (url.startsWith("https://a/")) return new Response("boom", { status: 500 })
        return jsonResponse(123)
      })
    )

    const api = createEsploraClient(["https://a/api", "https://b/api"])
    expect(await api.getTipHeight()).toEqual(123)
    // sticky: second request goes straight to b
    expect(await api.getTipHeight()).toEqual(123)
    expect(calls).toEqual([
      "https://a/api/blocks/tip/height",
      "https://b/api/blocks/tip/height",
      "https://b/api/blocks/tip/height",
    ])
  })

  it("throws immediately on deterministic 4xx without failover", async () => {
    const calls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url)
        return new Response("Transaction not found", { status: 404 })
      })
    )

    const api = createEsploraClient(["https://a/api", "https://b/api"])
    await expect(api.getTxStatus("00".repeat(32))).rejects.toThrow("Transaction not found")
    expect(calls).toHaveLength(1)
  })

  it("normalizes mempool.space fee estimates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/v1/fees/recommended"))
          return jsonResponse({
            fastestFee: 20,
            halfHourFee: 15,
            hourFee: 10,
            economyFee: 4,
            minimumFee: 2,
          })
        throw new Error("unexpected url")
      })
    )

    const api = createEsploraClient(["https://mempool.space/api"])
    expect(await api.getFeeEstimates()).toEqual({
      fastest: 20,
      halfHour: 15,
      hour: 10,
      economy: 4,
      minimum: 2,
    })
  })

  it("falls back to vanilla esplora fee-estimates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/v1/fees/recommended")) return new Response("not found", { status: 404 })
        if (url.endsWith("/fee-estimates"))
          return jsonResponse({ "1": 21.3, "3": 14.7, "6": 9.2, "144": 3.1, "1008": 1.0 })
        throw new Error("unexpected url")
      })
    )

    const api = createEsploraClient(["https://blockstream.info/api"])
    expect(await api.getFeeEstimates()).toEqual({
      fastest: 21.3,
      halfHour: 14.7,
      hour: 9.2,
      economy: 3.1,
      minimum: 1,
    })
    // second call skips the mempool endpoint (remembered as unavailable)
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    const callsBefore = fetchMock.mock.calls.length
    await api.getFeeEstimates()
    expect(fetchMock.mock.calls.length).toEqual(callsBefore + 1)
  })

  it("broadcasts a transaction and returns the txid as text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        expect(url).toEqual("https://a/api/tx")
        expect(init?.method).toEqual("POST")
        expect(init?.body).toEqual("02000000beef")
        return new Response("ab".repeat(32), { status: 200 })
      })
    )

    const api = createEsploraClient(["https://a/api"])
    expect(await api.broadcastTx("02000000beef")).toEqual("ab".repeat(32))
  })
})
