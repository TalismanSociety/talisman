import { afterEach, describe, expect, it, vi } from "vitest"

import { getSolTransport } from "./getSolRpc"

const RPC_A = "https://a.example.com"
const RPC_B = "https://b.example.com"
const RPC_C = "https://c.example.com"

const PAYLOAD = { jsonrpc: "2.0", id: 1, method: "getSlot", params: [] }

const ok = (result: unknown) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })

type Handler = (signal: AbortSignal | undefined) => Promise<Response> | Response

/** Stubs fetch with one handler per RPC url and records the order of the calls */
const stubFetch = (handlers: Record<string, Handler>) => {
  const calls: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(url)
      const handler = handlers[url]
      if (!handler) throw new TypeError(`no handler for ${url}`)
      return handler(init?.signal ?? undefined)
    })
  )
  return calls
}

const down: Handler = () => {
  throw new TypeError("fetch failed")
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("getSolTransport", () => {
  it("fails over to the next rpc when one is down", async () => {
    const calls = stubFetch({ [RPC_A]: down, [RPC_B]: () => ok(42) })
    const transport = getSolTransport("solana", [RPC_A, RPC_B])

    await expect(transport({ payload: PAYLOAD })).resolves.toMatchObject({ result: 42n })
    expect(calls).toEqual([RPC_A, RPC_B])
  })

  it("fails over on an HTTP error status", async () => {
    const calls = stubFetch({
      [RPC_A]: () => new Response("bad gateway", { status: 502 }),
      [RPC_B]: () => ok(42),
    })
    const transport = getSolTransport("solana", [RPC_A, RPC_B])

    await expect(transport({ payload: PAYLOAD })).resolves.toMatchObject({ result: 42n })
    expect(calls).toEqual([RPC_A, RPC_B])
  })

  it("returns JSON-RPC errors without trying another rpc", async () => {
    const error = { code: -32002, message: "Transaction simulation failed" }
    const calls = stubFetch({
      [RPC_A]: () =>
        new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error }), { status: 200 }),
      [RPC_B]: () => ok(42),
    })
    const transport = getSolTransport("solana", [RPC_A, RPC_B])

    // kit parses JSON-RPC numbers as bigints
    await expect(transport({ payload: PAYLOAD })).resolves.toMatchObject({
      error: { ...error, code: -32002n },
    })
    expect(calls).toEqual([RPC_A])
  })

  it("starts the next request at the rpc that answered last", async () => {
    const calls = stubFetch({ [RPC_A]: down, [RPC_B]: () => ok(42), [RPC_C]: () => ok(43) })
    const onRpcSuccess = vi.fn()
    const transport = getSolTransport("solana", [RPC_A, RPC_B, RPC_C], { onRpcSuccess })

    await transport({ payload: PAYLOAD })
    await transport({ payload: PAYLOAD })

    expect(calls).toEqual([RPC_A, RPC_B, RPC_B])
    expect(onRpcSuccess.mock.calls).toEqual([[RPC_B], [RPC_B]])
  })

  it("tries every rpc once per request while concurrent requests change the preferred rpc", async () => {
    let failFirstRequest: (error: Error) => void = () => {}
    let callsToA = 0
    const calls = stubFetch({
      [RPC_A]: () => {
        if (callsToA++ > 0) throw new TypeError("fetch failed")
        return new Promise<Response>((_, reject) => {
          failFirstRequest = reject
        })
      },
      [RPC_B]: () => ok(42),
    })
    const transport = getSolTransport("solana", [RPC_A, RPC_B])

    const first = transport({ payload: PAYLOAD })
    // distinct params, else kit coalesces both requests into one
    const second = { ...PAYLOAD, params: [{ commitment: "finalized" }] }
    await expect(transport({ payload: second })).resolves.toMatchObject({ result: 42n })
    failFirstRequest(new TypeError("fetch failed"))

    await expect(first).resolves.toMatchObject({ result: 42n })
    expect(calls).toEqual([RPC_A, RPC_A, RPC_B, RPC_B])
  })

  it("throws the last error when every rpc fails", async () => {
    stubFetch({ [RPC_A]: down, [RPC_B]: () => new Response("", { status: 503 }) })
    const transport = getSolTransport("solana", [RPC_A, RPC_B])

    await expect(transport({ payload: PAYLOAD })).rejects.toMatchObject({
      context: { statusCode: 503 },
    })
  })

  it("retries the rpcs when one was rate limited and a later one failed", async () => {
    vi.useFakeTimers()
    let callsToA = 0
    const calls = stubFetch({
      [RPC_A]: () => (callsToA++ ? ok(42) : new Response("", { status: 429 })),
      [RPC_B]: () => new Response("", { status: 503 }),
    })
    const transport = getSolTransport("solana", [RPC_A, RPC_B])

    const request = transport({ payload: PAYLOAD })
    await vi.advanceTimersByTimeAsync(500)

    await expect(request).resolves.toMatchObject({ result: 42n })
    expect(calls).toEqual([RPC_A, RPC_B, RPC_A])
  })

  it("moves on from an rpc that does not answer in time", async () => {
    vi.useFakeTimers()
    const hang: Handler = (signal) =>
      new Promise((_, reject) => signal?.addEventListener("abort", () => reject(signal.reason)))
    const calls = stubFetch({ [RPC_A]: hang, [RPC_B]: () => ok(42) })
    const transport = getSolTransport("solana", [RPC_A, RPC_B])

    const request = transport({ payload: PAYLOAD })
    await vi.advanceTimersByTimeAsync(20_000)

    await expect(request).resolves.toMatchObject({ result: 42n })
    expect(calls).toEqual([RPC_A, RPC_B])
  })

  it("does not fail over when the caller aborts", async () => {
    const controller = new AbortController()
    const calls = stubFetch({
      [RPC_A]: () => {
        controller.abort(new Error("cancelled"))
        throw controller.signal.reason
      },
      [RPC_B]: () => ok(42),
    })
    const transport = getSolTransport("solana", [RPC_A, RPC_B])

    await expect(transport({ payload: PAYLOAD, signal: controller.signal })).rejects.toThrow(
      "cancelled"
    )
    expect(calls).toEqual([RPC_A])
  })

  it("does not send a request that the caller already aborted", async () => {
    const calls = stubFetch({ [RPC_A]: () => ok(42), [RPC_B]: () => ok(42) })
    const transport = getSolTransport("solana", [RPC_A, RPC_B])

    await expect(
      transport({ payload: PAYLOAD, signal: AbortSignal.abort(new Error("cancelled")) })
    ).rejects.toThrow("cancelled")
    expect(calls).toEqual([])
  })

  it("rejects requests when the network has no rpcs", async () => {
    const transport = getSolTransport("solana", [])
    await expect(transport({ payload: PAYLOAD })).rejects.toThrow("No RPCs found")
  })
})
