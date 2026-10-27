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

  describe("sendTransaction", () => {
    const SEND_TRANSACTION = {
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: ["AQID", { encoding: "base64" }],
    }

    const sentParams = () =>
      vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(init?.body as string).params)

    it("resends without preflight after a failure where the rpc may have processed it", async () => {
      stubFetch({ [RPC_A]: down, [RPC_B]: () => ok("signature") })
      const transport = getSolTransport("solana", [RPC_A, RPC_B])

      await transport({ payload: SEND_TRANSACTION })

      expect(sentParams()).toEqual([
        ["AQID", { encoding: "base64" }],
        ["AQID", { encoding: "base64", skipPreflight: true }],
      ])
    })

    it("resends with preflight after a rate limit", async () => {
      stubFetch({
        [RPC_A]: () => new Response("", { status: 429 }),
        [RPC_B]: () => ok("signature"),
      })
      const transport = getSolTransport("solana", [RPC_A, RPC_B])

      await transport({ payload: SEND_TRANSACTION })

      expect(sentParams()).toEqual([
        ["AQID", { encoding: "base64" }],
        ["AQID", { encoding: "base64" }],
      ])
    })

    it("keeps preflight off when retrying after a rate limit", async () => {
      vi.useFakeTimers()
      let callsToA = 0
      stubFetch({
        [RPC_A]: () => {
          if (callsToA++ === 0) throw new TypeError("fetch failed")
          return ok("signature")
        },
        [RPC_B]: () => new Response("", { status: 429 }),
      })
      const transport = getSolTransport("solana", [RPC_A, RPC_B])

      const request = transport({ payload: SEND_TRANSACTION })
      await vi.advanceTimersByTimeAsync(500)
      await request

      expect(sentParams()).toEqual([
        ["AQID", { encoding: "base64" }],
        ["AQID", { encoding: "base64", skipPreflight: true }],
        ["AQID", { encoding: "base64", skipPreflight: true }],
      ])
    })

    it("leaves other methods unchanged on failover", async () => {
      stubFetch({ [RPC_A]: down, [RPC_B]: () => ok(42) })
      const transport = getSolTransport("solana", [RPC_A, RPC_B])

      await transport({ payload: PAYLOAD })

      expect(sentParams()).toEqual([[], []])
    })
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

describe("getSolTransport chain identity", () => {
  const GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
  const OTHER_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"

  // verdicts last for the process: each test gets a network of its own
  let n = 0
  const nextNetworkId = () => `solana-identity-test-${n++}`

  type Rpc = { genesisHash: string | "down"; answer?: () => Response | Promise<Response> }

  /** Stubs fetch with the genesis hash and answer of each RPC, and records (url, method) */
  const stubChains = (rpcs: Record<string, Rpc>) => {
    const requests: [string, string, unknown][] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const { method, params } = JSON.parse(String(init?.body))
        requests.push([url, method, params])
        const rpc = rpcs[url]
        if (!rpc) throw new TypeError(`no handler for ${url}`)
        if (method === "getGenesisHash") {
          if (rpc.genesisHash === "down") throw new TypeError("fetch failed")
          return ok(rpc.genesisHash)
        }
        if (!rpc.answer) throw new TypeError("fetch failed")
        return rpc.answer()
      })
    )
    return requests
  }

  it("sends nothing but getGenesisHash to an rpc of another chain", async () => {
    const requests = stubChains({
      [RPC_A]: { genesisHash: OTHER_GENESIS, answer: () => ok(1) },
      [RPC_B]: { genesisHash: GENESIS, answer: () => ok(42) },
    })
    const transport = getSolTransport(nextNetworkId(), [RPC_A, RPC_B], { genesisHash: GENESIS })

    await expect(transport({ payload: PAYLOAD })).resolves.toMatchObject({ result: 42n })
    await expect(transport({ payload: PAYLOAD })).resolves.toMatchObject({ result: 42n })
    expect(requests.map(([url, method]) => [url, method])).toEqual([
      [RPC_A, "getGenesisHash"],
      [RPC_B, "getGenesisHash"],
      [RPC_B, "getSlot"],
      [RPC_B, "getSlot"],
    ])
  })

  it("skips an rpc of another chain on a new transport without probing it again", async () => {
    const networkId = nextNetworkId()
    const requests = stubChains({
      [RPC_A]: { genesisHash: OTHER_GENESIS, answer: () => ok(1) },
      [RPC_B]: { genesisHash: GENESIS, answer: () => ok(42) },
    })
    await getSolTransport(networkId, [RPC_A, RPC_B], { genesisHash: GENESIS })({
      payload: PAYLOAD,
    })
    await getSolTransport(networkId, [RPC_A, RPC_B], { genesisHash: GENESIS })({
      payload: PAYLOAD,
    })
    expect(requests.filter(([url]) => url === RPC_A).map(([, method]) => method)).toEqual([
      "getGenesisHash",
    ])
  })

  it("shares one probe between concurrent requests", async () => {
    const requests = stubChains({ [RPC_A]: { genesisHash: GENESIS, answer: () => ok(42) } })
    const transport = getSolTransport(nextNetworkId(), [RPC_A], { genesisHash: GENESIS })

    // distinct params, else kit coalesces both requests into one
    const second = { ...PAYLOAD, params: [{ commitment: "finalized" }] }
    await Promise.all([transport({ payload: PAYLOAD }), transport({ payload: second })])
    expect(requests.filter(([, method]) => method === "getGenesisHash")).toHaveLength(1)
  })

  it("treats a failed probe as the rpc failing, and probes it again on the next request", async () => {
    let callsToB = 0
    const requests = stubChains({
      [RPC_A]: { genesisHash: "down", answer: () => ok(1) },
      [RPC_B]: {
        genesisHash: GENESIS,
        answer: () => {
          if (callsToB++) throw new TypeError("fetch failed")
          return ok(42)
        },
      },
    })
    const transport = getSolTransport(nextNetworkId(), [RPC_A, RPC_B], { genesisHash: GENESIS })

    await expect(transport({ payload: PAYLOAD })).resolves.toMatchObject({ result: 42n })
    // B now fails, so the request comes back round to A
    await expect(transport({ payload: PAYLOAD })).rejects.toThrow()
    expect(requests.filter(([url]) => url === RPC_A).map(([, method]) => method)).toEqual([
      "getGenesisHash",
      "getGenesisHash",
    ])
  })

  it("keeps preflight on for a transaction after an rpc failed its probe", async () => {
    const requests = stubChains({
      [RPC_A]: { genesisHash: "down" },
      [RPC_B]: { genesisHash: GENESIS, answer: () => ok("signature") },
    })
    const transport = getSolTransport(nextNetworkId(), [RPC_A, RPC_B], { genesisHash: GENESIS })

    await transport({
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: ["AQID", { encoding: "base64" }],
      },
    })
    expect(requests.filter(([, method]) => method === "sendTransaction")).toEqual([
      [RPC_B, "sendTransaction", ["AQID", { encoding: "base64" }]],
    ])
  })

  it("fails when no rpc serves the chain", async () => {
    const requests = stubChains({
      [RPC_A]: { genesisHash: OTHER_GENESIS, answer: () => ok(1) },
      [RPC_B]: { genesisHash: OTHER_GENESIS, answer: () => ok(2) },
    })
    const transport = getSolTransport(nextNetworkId(), [RPC_A, RPC_B], { genesisHash: GENESIS })

    await expect(transport({ payload: PAYLOAD })).rejects.toThrow("does not serve network")
    expect(requests.every(([, method]) => method === "getGenesisHash")).toBe(true)
  })

  it("gives up on a probe that does not answer in time", async () => {
    vi.useFakeTimers()
    const requests = stubChains({
      [RPC_A]: { genesisHash: GENESIS },
      [RPC_B]: { genesisHash: GENESIS, answer: () => ok(42) },
    })
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}))
    const transport = getSolTransport(nextNetworkId(), [RPC_A, RPC_B], { genesisHash: GENESIS })

    const request = transport({ payload: PAYLOAD })
    await vi.advanceTimersByTimeAsync(5_000)
    await expect(request).resolves.toMatchObject({ result: 42n })
    expect(requests.map(([url, method]) => [url, method])).toEqual([
      [RPC_B, "getGenesisHash"],
      [RPC_B, "getSlot"],
    ])
  })
})
