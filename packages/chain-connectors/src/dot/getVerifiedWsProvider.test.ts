import type { Middleware, StatusChange } from "@polkadot-api/ws-provider"
import { WsEvent } from "@polkadot-api/ws-provider"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fakeWebSocketClass } from "./__fixtures__/fakeWebSocket"
import { getVerifiedWsProvider } from "./getVerifiedWsProvider"

const GENESIS = "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
const OTHER_GENESIS = "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe"
const A = "wss://a.example"
const B = "wss://b.example"

// biome-ignore lint/suspicious/noExplicitAny: test messages are free-form JSON-RPC
type Msg = any

// verdicts last for the process: each test gets a network of its own
let n = 0
const nextNetworkId = () => `verified-provider-test-${n++}`

const stubWebSocket = () => {
  const seen: [string, string][] = []
  vi.stubGlobal("WebSocket", fakeWebSocketClass({ [A]: OTHER_GENESIS, [B]: GENESIS }, seen))
  return seen
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A middleware that sends a message of its own on each new connection, as papi's does */
const greetingMiddleware: Middleware = (base) => (onMessage, onHalt) => {
  const connection = base(onMessage, onHalt)
  connection.send({ jsonrpc: "2.0", id: "greeting", method: "greeting", params: [] })
  return connection
}

const request = (provider: ReturnType<typeof getVerifiedWsProvider>) =>
  new Promise<Msg>((resolve) => {
    const connection = provider((message: Msg) => {
      if (message.id !== "1") return
      resolve(message)
      connection.disconnect()
    })
    connection.send({ jsonrpc: "2.0", id: "1", method: "system_name", params: [] })
  })

describe("getVerifiedWsProvider", () => {
  it("sends nothing from the middleware to an RPC before it has passed the check", async () => {
    const seen = stubWebSocket()
    const provider = getVerifiedWsProvider({
      networkId: nextNetworkId(),
      rpcs: [A, B],
      genesisHash: GENESIS,
      middleware: greetingMiddleware,
    })

    await expect(request(provider)).resolves.toMatchObject({ result: `system_name@${B}` })
    expect(seen).toEqual([
      [A, "chain_getBlockHash"],
      [B, "chain_getBlockHash"],
      [B, "greeting"],
      [B, "system_name"],
    ])
  })

  it("applies the middleware to a network without a genesis hash", async () => {
    const seen = stubWebSocket()
    const provider = getVerifiedWsProvider({
      networkId: nextNetworkId(),
      rpcs: [A],
      genesisHash: undefined,
      middleware: greetingMiddleware,
    })

    await expect(request(provider)).resolves.toMatchObject({ result: `system_name@${A}` })
    expect(seen).toEqual([
      [A, "greeting"],
      [A, "system_name"],
    ])
  })

  it("reports CONNECTED only for an RPC that has passed the check", async () => {
    stubWebSocket()
    const connected: string[] = []
    const provider = getVerifiedWsProvider({
      networkId: nextNetworkId(),
      rpcs: [A, B],
      genesisHash: GENESIS,
      onStatusChanged: (status: StatusChange) => {
        if (status.type === WsEvent.CONNECTED) connected.push(status.uri)
      },
    })

    await request(provider)
    expect(connected).toEqual([B])
  })
})
