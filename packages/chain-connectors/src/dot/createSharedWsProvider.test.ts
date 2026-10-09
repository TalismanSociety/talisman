import { type StatusChange, WsEvent, type WsJsonRpcProvider } from "@polkadot-api/ws-provider"
import type { DotNetwork, IChaindataNetworkProvider } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

import { ChainConnectorDot } from "./ChainConnectorDot"
import { createSharedWsProvider, type WsProviderFactory } from "./createSharedWsProvider"

type Message = Parameters<Parameters<WsJsonRpcProvider>[0]>[0]
type Request = { id?: string | number; method: string; params?: unknown }

const CONNECTED: StatusChange = { type: WsEvent.CONNECTED, uri: "wss://a" }

const createFakeBase = () => {
  const sockets: Array<{
    endpoints: string | string[]
    sent: Request[]
    receive: (message: Message) => void
    setStatus: (status: StatusChange) => void
    disconnected: boolean
  }> = []

  const factory: WsProviderFactory = (endpoints, config) => {
    let status: StatusChange = { type: WsEvent.CLOSE, event: null }
    const socket = {
      endpoints,
      sent: [] as Request[],
      receive: (_message: Message) => {},
      setStatus: (next: StatusChange) => {
        status = next
        config?.onStatusChanged?.(next)
      },
      disconnected: false,
    }
    sockets.push(socket)

    const provider = (onMessage: (message: Message) => void) => {
      socket.receive = onMessage
      return {
        send: (message: Request) => socket.sent.push(message),
        disconnect: () => {
          socket.disconnected = true
        },
      }
    }
    return Object.assign(provider, {
      switch: vi.fn(),
      getStatus: () => status,
    }) as WsJsonRpcProvider
  }

  return { factory, sockets }
}

describe("createSharedWsProvider", () => {
  it("opens one socket per endpoint list, whoever connects first", () => {
    const base = createFakeBase()
    const shared = createSharedWsProvider(base.factory)

    shared(["wss://a", "wss://b"])(() => {})
    shared(["wss://a", "wss://b"])(() => {})
    shared("wss://c")(() => {})
    shared(["wss://c"])(() => {})

    expect(base.sockets.map((socket) => socket.endpoints)).toEqual([
      ["wss://a", "wss://b"],
      "wss://c",
    ])
  })

  it("returns each response to the consumer that sent the request, with its own id", () => {
    const base = createFakeBase()
    const shared = createSharedWsProvider(base.factory)
    const first: Message[] = []
    const second: Message[] = []

    shared("wss://a")((message) => first.push(message)).send({ jsonrpc: "2.0", id: 1, method: "m" })
    shared("wss://a")((message) => second.push(message)).send({
      jsonrpc: "2.0",
      id: "1",
      method: "m",
    })

    const [socket] = base.sockets
    const [firstWireId, secondWireId] = socket.sent.map((request) => request.id)
    expect(firstWireId).not.toEqual(secondWireId)

    socket.receive({ jsonrpc: "2.0", id: secondWireId!, result: "for second" })
    socket.receive({ jsonrpc: "2.0", id: firstWireId!, result: "for first" })

    expect(first).toEqual([{ jsonrpc: "2.0", id: 1, result: "for first" }])
    expect(second).toEqual([{ jsonrpc: "2.0", id: "1", result: "for second" }])
  })

  it("delivers notifications and status changes to every consumer", () => {
    const base = createFakeBase()
    const shared = createSharedWsProvider(base.factory)
    const firstStatus = vi.fn()
    const secondStatus = vi.fn()
    const first: Message[] = []
    const second: Message[] = []

    shared("wss://a", { onStatusChanged: firstStatus })((message) => first.push(message))
    shared("wss://a", { onStatusChanged: secondStatus })((message) => second.push(message))

    const [socket] = base.sockets
    const notification = {
      jsonrpc: "2.0",
      method: "state_storage",
      params: { subscription: "s" },
    } as const
    socket.receive(notification)
    socket.setStatus(CONNECTED)

    expect(first).toEqual([notification])
    expect(second).toEqual([notification])
    expect(firstStatus).toHaveBeenCalledWith(CONNECTED)
    expect(secondStatus).toHaveBeenCalledWith(CONNECTED)
  })

  it("closes the socket when the last consumer disconnects, and opens a new one on the next connect", () => {
    const base = createFakeBase()
    const shared = createSharedWsProvider(base.factory)
    const firstStatus = vi.fn()

    const first = shared("wss://a", { onStatusChanged: firstStatus })(() => {})
    const second = shared("wss://a")(() => {})

    first.disconnect()
    base.sockets[0]!.setStatus(CONNECTED)
    expect(firstStatus).not.toHaveBeenCalled()
    expect(base.sockets[0]!.disconnected).toBe(false)

    second.disconnect()
    expect(base.sockets[0]!.disconnected).toBe(true)

    shared("wss://a")(() => {})
    expect(base.sockets).toHaveLength(2)
  })
})

describe("ChainConnectorDot on a shared socket", () => {
  const SUBSCRIBE = "state_subscribeStorage"

  const setup = () => {
    const base = createFakeBase()
    const shared = createSharedWsProvider(base.factory)
    const chaindata = {
      getNetworkById: async () => ({ id: "polkadot", rpcs: ["wss://a"] }) as unknown as DotNetwork,
    } as unknown as IChaindataNetworkProvider
    const connector = new ChainConnectorDot(chaindata, { getWsProvider: shared })

    shared("wss://a")(() => {})
    const socket = base.sockets[0]!
    socket.setStatus(CONNECTED)

    const subscribe = async () => {
      const subscribed = connector.subscribe("polkadot", SUBSCRIBE, "state_storage", [], () => {})
      const request = await vi.waitFor(() => {
        const sent = socket.sent.findLast((message) => message.method === SUBSCRIBE)
        if (!sent) throw new Error("not subscribed yet")
        return sent
      })
      socket.receive({ jsonrpc: "2.0", id: request.id!, result: "sub-1" })
      return subscribed
    }

    return { connector, socket, subscribe }
  }

  it("resubscribes on reconnect when it joined an already connected socket", async () => {
    const { socket, subscribe } = setup()
    await subscribe()

    socket.setStatus({ type: WsEvent.CLOSE, event: null })
    socket.setStatus(CONNECTED)

    expect(socket.sent.filter((message) => message.method === SUBSCRIBE)).toHaveLength(2)
  })

  it("unsubscribes on the server when its last subscription ends, since the socket stays open", async () => {
    const { socket, subscribe } = setup()
    const unsubscribe = await subscribe()

    unsubscribe("state_unsubscribeStorage")

    expect(socket.sent).toContainEqual(
      expect.objectContaining({ method: "state_unsubscribeStorage", params: ["sub-1"] })
    )
    expect(socket.disconnected).toBe(false)
  })
})
