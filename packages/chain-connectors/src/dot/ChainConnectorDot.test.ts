import { WsEvent } from "@polkadot-api/ws-provider"
import type { IChaindataNetworkProvider } from "@talismn/chaindata-provider"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChainConnectorDot } from "./ChainConnectorDot"

type MockProvider = {
  onStatusChanged: (status: { type: WsEvent; uri?: string }) => void
  /** the endpoint passed to each `switch()` call */
  switches: (string | undefined)[]
}

const sockets = vi.hoisted(() => ({
  opened: 0,
  destroyed: 0,
  timeouts: [] as (number | undefined)[],
  providers: [] as MockProvider[],
  /** methods whose requests are never answered */
  unanswered: new Set<string>(),
}))

vi.mock("@polkadot-api/ws-provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@polkadot-api/ws-provider")>()),
  getWsProvider: (
    _endpoints: string[],
    config?: { timeout?: number; onStatusChanged?: MockProvider["onStatusChanged"] }
  ) => {
    sockets.opened++
    sockets.timeouts.push(config?.timeout)
    const provider: MockProvider = {
      onStatusChanged: config?.onStatusChanged ?? (() => {}),
      switches: [],
    }
    sockets.providers.push(provider)
    return {
      switch: (uri?: string) => {
        provider.switches.push(uri)
      },
      getStatus: () => ({ type: 2 }),
    }
  },
}))

vi.mock("@polkadot-api/substrate-client", () => ({
  createClient: () => ({
    _request: (
      method: string,
      _params: unknown[],
      { onSuccess }: { onSuccess: (result: unknown, follow: () => () => void) => void }
    ) => {
      if (sockets.unanswered.has(method)) return () => {}
      // a subscribe's success also hands over the function that routes its notifications
      queueMicrotask(() => onSuccess("0x01", () => () => {}))
      return () => {}
    },
    request: () => Promise.resolve(true),
    destroy: () => {
      sockets.destroyed++
    },
  }),
}))

const chaindata = {
  getNetworkById: async () => ({ id: "bittensor", rpcs: ["wss://a.example", "wss://b.example"] }),
} as unknown as IChaindataNetworkProvider

const subscribe = (connector: ChainConnectorDot) =>
  connector.subscribe("bittensor", "state_subscribeStorage", "state_storage", [[]], () => {}, false)

describe("ChainConnectorDot connection reuse", () => {
  beforeEach(() => {
    sockets.opened = 0
    sockets.destroyed = 0
    sockets.timeouts = []
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps the socket of a finished request for the subscription that follows it", async () => {
    const connector = new ChainConnectorDot(chaindata)

    // balances read the runtime version, then subscribe to storage
    await connector.send("bittensor", "state_getRuntimeVersion", [])
    await subscribe(connector)

    expect(sockets.opened).toBe(1)
    expect(sockets.destroyed).toBe(0)
  })

  it("closes an unused socket once it has been idle for a while", async () => {
    const connector = new ChainConnectorDot(chaindata)

    await connector.send("bittensor", "state_getRuntimeVersion", [])
    expect(sockets.destroyed).toBe(0)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(sockets.destroyed).toBe(1)

    // the next request opens a new one
    await connector.send("bittensor", "state_getRuntimeVersion", [])
    expect(sockets.opened).toBe(2)
  })

  it("keeps the socket while a subscription holds it", async () => {
    const connector = new ChainConnectorDot(chaindata)

    const unsubscribe = await subscribe(connector)
    await connector.send("bittensor", "state_getRuntimeVersion", [])
    await vi.advanceTimersByTimeAsync(60_000)
    expect(sockets.destroyed).toBe(0)

    unsubscribe("state_unsubscribeStorage")
    await vi.advanceTimersByTimeAsync(60_000)
    expect(sockets.destroyed).toBe(1)
    expect(sockets.opened).toBe(1)
  })

  it("closes the socket at once on reset, even while idle", async () => {
    const connector = new ChainConnectorDot(chaindata)

    await connector.send("bittensor", "state_getRuntimeVersion", [])
    await connector.reset("bittensor")
    expect(sockets.destroyed).toBe(1)

    // the idle close of the reset socket doesn't fire later
    await vi.advanceTimersByTimeAsync(60_000)
    expect(sockets.destroyed).toBe(1)
  })
})

describe("ChainConnectorDot connection timeout", () => {
  beforeEach(() => {
    sockets.timeouts = []
  })

  it("leaves polkadot-api's default in place unless one is given", async () => {
    await new ChainConnectorDot(chaindata).send("bittensor", "system_health", [])
    expect(sockets.timeouts).toEqual([undefined])
  })

  it("passes the given connection timeout to the provider", async () => {
    await new ChainConnectorDot(chaindata, { connectionTimeout: 15_000 }).send(
      "bittensor",
      "system_health",
      []
    )
    expect(sockets.timeouts).toEqual([15_000])
  })
})

describe("ChainConnectorDot after a suspension", () => {
  // Date.now is driven by hand: while the runtime is suspended no timer runs, and on resume all
  // the timers that came due run at once, each seeing the resume time
  let now = 1_000_000
  const run = async (ms: number) => {
    for (let left = ms; left > 0; left -= 500) {
      const step = Math.min(500, left)
      now += step
      await vi.advanceTimersByTimeAsync(step)
    }
  }
  const suspend = async (ms: number) => {
    now += ms
    await vi.advanceTimersByTimeAsync(ms)
  }

  // a fresh @talismn/util per test, so that no earlier test's suspension watch carries over
  let Connector: typeof ChainConnectorDot
  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
    vi.spyOn(Date, "now").mockImplementation(() => now)
    sockets.providers = []
    sockets.unanswered.clear()
    Connector = (await import("./ChainConnectorDot")).ChainConnectorDot
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const connect = (provider: MockProvider, uri: string) => {
    provider.onStatusChanged({ type: WsEvent.CONNECTING, uri })
    provider.onStatusChanged({ type: WsEvent.CONNECTED, uri })
  }

  it("reconnects to the same endpoint after a long suspension", async () => {
    const connector = new Connector(chaindata)
    await subscribe(connector)
    const provider = sockets.providers[0]!
    connect(provider, "wss://b.example")

    await run(2_000)
    await suspend(90_000)
    expect(provider.switches).toEqual(["wss://b.example"])
  })

  it("keeps the endpoint when the socket fails just after a short suspension", async () => {
    const connector = new Connector(chaindata)
    await subscribe(connector)
    const provider = sockets.providers[0]!
    connect(provider, "wss://b.example")

    await run(2_000)
    await suspend(8_000)
    // too short to replace the socket
    expect(provider.switches).toEqual([])

    // the provider's heartbeat drops the socket on resume
    provider.onStatusChanged({ type: WsEvent.ERROR })
    expect(provider.switches).toEqual(["wss://b.example"])

    // when the endpoint then fails again, the provider moves on as usual
    provider.onStatusChanged({ type: WsEvent.CONNECTING, uri: "wss://b.example" })
    provider.onStatusChanged({ type: WsEvent.ERROR })
    expect(provider.switches).toEqual(["wss://b.example"])
  })

  it("lets the provider move on when a socket fails while the app runs", async () => {
    const connector = new Connector(chaindata)
    await subscribe(connector)
    const provider = sockets.providers[0]!
    connect(provider, "wss://b.example")

    await run(30_000)
    provider.onStatusChanged({ type: WsEvent.ERROR })
    expect(provider.switches).toEqual([])
  })

  it("doesn't time a request out across a suspension", async () => {
    const connector = new Connector(chaindata)
    await subscribe(connector)
    const provider = sockets.providers[0]!
    connect(provider, "wss://b.example")

    sockets.unanswered.add("state_call")
    const result = connector.send("bittensor", "state_call", []).then(
      () => "answered",
      (error: Error) => error.message
    )
    await run(5_000)
    await suspend(90_000)
    await run(20_000)
    expect(await Promise.race([result, Promise.resolve("pending")])).toBe("pending")

    // 30s of running time without an answer is a timeout, and the endpoint is left
    await run(10_500)
    expect(await result).toBe("Timeout")
    expect(provider.switches.at(-1)).toBeUndefined()
  })
})
