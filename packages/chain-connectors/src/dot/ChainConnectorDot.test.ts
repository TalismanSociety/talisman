import type { IChaindataNetworkProvider } from "@talismn/chaindata-provider"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChainConnectorDot } from "./ChainConnectorDot"

const sockets = vi.hoisted(() => ({ opened: 0, destroyed: 0 }))

vi.mock("@polkadot-api/ws-provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@polkadot-api/ws-provider")>()),
  getWsProvider: () => {
    sockets.opened++
    return { switch: () => {}, getStatus: () => ({ type: 2 }) }
  },
}))

vi.mock("@polkadot-api/substrate-client", () => ({
  createClient: () => ({
    _request: (
      _method: string,
      _params: unknown[],
      { onSuccess }: { onSuccess: (result: unknown, follow: () => () => void) => void }
    ) => {
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
