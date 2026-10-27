import type { InnerJsonRpcProvider } from "@polkadot-api/ws-provider"
import { getWsProvider, WsEvent } from "@polkadot-api/ws-provider"
import { beforeEach, describe, expect, it } from "vitest"

import { getIdentityVerdict, recordIdentityVerdict, resetIdentityVerdicts } from "../rpcIdentity"
import { fakeWebSocketClass } from "./__fixtures__/fakeWebSocket"
import { chainIdentityGate } from "./chainIdentityGate"

const NETWORK = "gate-test"
const GENESIS = "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
const OTHER_GENESIS = "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe"
const RPC = "wss://rpc.example/one"

// biome-ignore lint/suspicious/noExplicitAny: test messages are free-form JSON-RPC
type Msg = any

/** A connection below the gate: records what reaches the socket and lets the test answer */
const setup = (options: { probeTimeoutMs?: number } = {}) => {
  let uri: string | undefined
  const wire: Msg[] = []
  const received: Msg[] = []
  const halts: unknown[] = []
  const matches: string[] = []
  let disconnects = 0
  let toGate: ((message: Msg) => void) | undefined
  let haltGate: ((error: unknown) => void) | undefined

  const base: InnerJsonRpcProvider = (onMessage, onHalt) => {
    // the ws provider emits CONNECTING while opening the socket
    uri = RPC
    toGate = onMessage
    haltGate = onHalt
    return {
      send: (message) => wire.push(message),
      disconnect: () => disconnects++,
    }
  }

  const gate = chainIdentityGate({
    networkId: NETWORK,
    genesisHash: GENESIS,
    getUri: () => uri,
    onMatch: (u) => matches.push(u),
    ...options,
  })
  const connection = gate(base)(
    (message) => received.push(message),
    (error) => halts.push(error)
  )

  return {
    connection,
    wire,
    received,
    halts,
    matches,
    disconnects: () => disconnects,
    answer: (message: Msg) => toGate!({ jsonrpc: "2.0", ...message }),
    halt: (error: unknown) => haltGate!(error),
  }
}

const request = (id: string, method = "rpc_methods") => ({
  jsonrpc: "2.0" as const,
  id,
  method,
  params: [],
})

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  resetIdentityVerdicts()
})

describe("chainIdentityGate", () => {
  it("holds every message until the RPC reports the network's genesis hash", () => {
    const t = setup()
    t.connection.send(request("1"))
    t.connection.send(request("2", "transaction_v1_broadcast"))

    expect(t.wire).toHaveLength(1)
    const probe = t.wire[0]
    expect(probe.method).toBe("chain_getBlockHash")
    expect(probe.params).toEqual([0])

    t.answer({ id: probe.id, result: GENESIS.toUpperCase().replace("0X", "0x") })

    expect(t.wire.slice(1).map((m) => m.id)).toEqual(["1", "2"])
    expect(getIdentityVerdict(NETWORK, RPC)).toBe("match")
    expect(t.matches).toEqual([RPC])
    expect(t.received).toEqual([])

    t.connection.send(request("3"))
    t.answer({ id: "3", result: [] })
    expect(t.wire.at(-1).id).toBe("3")
    expect(t.received).toEqual([{ jsonrpc: "2.0", id: "3", result: [] }])
  })

  it("closes and halts a connection to another chain without sending it anything", () => {
    const t = setup()
    t.connection.send(request("1", "transaction_v1_broadcast"))
    t.answer({ id: t.wire[0].id, result: OTHER_GENESIS })

    expect(t.wire).toHaveLength(1)
    expect(t.disconnects()).toBe(1)
    expect(t.halts).toHaveLength(1)
    expect(getIdentityVerdict(NETWORK, RPC)).toBe("mismatch")
    expect(t.matches).toEqual([])

    t.connection.send(request("2"))
    expect(t.wire).toHaveLength(1)
  })

  it("drops replies other than the probe's while probing", () => {
    const t = setup()
    t.answer({ id: "unrelated", result: "0x00" })
    expect(t.received).toEqual([])
  })

  it("falls back to chainSpec_v1_genesisHash when the legacy method fails", () => {
    const t = setup()
    t.answer({ id: t.wire[0].id, error: { code: -32601, message: "Method not found" } })

    expect(t.wire[1].method).toBe("chainSpec_v1_genesisHash")
    t.answer({ id: t.wire[1].id, result: GENESIS })
    expect(getIdentityVerdict(NETWORK, RPC)).toBe("match")
    expect(t.halts).toEqual([])
  })

  it("halts without a verdict when neither method answers", () => {
    const t = setup()
    t.answer({ id: t.wire[0].id, error: { code: -32601, message: "Method not found" } })
    t.answer({ id: t.wire[1].id, error: { code: -32601, message: "Method not found" } })

    expect(t.halts).toHaveLength(1)
    expect(getIdentityVerdict(NETWORK, RPC)).toBeUndefined()
  })

  it("halts without a verdict when the probe times out", async () => {
    const t = setup({ probeTimeoutMs: 5 })
    t.connection.send(request("1"))
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(t.halts).toHaveLength(1)
    expect(t.disconnects()).toBe(1)
    expect(t.wire).toHaveLength(1)
    expect(getIdentityVerdict(NETWORK, RPC)).toBeUndefined()
  })

  it("passes an RPC known to match straight through", () => {
    recordIdentityVerdict(NETWORK, RPC, "match")
    const t = setup()
    t.connection.send(request("1"))
    expect(t.wire.map((m) => m.id)).toEqual(["1"])
  })

  it("halts an RPC known to mismatch on the next tick, sending nothing", async () => {
    recordIdentityVerdict(NETWORK, RPC, "mismatch")
    const t = setup()
    t.connection.send(request("1"))
    expect(t.halts).toHaveLength(0)

    await tick()
    expect(t.halts).toHaveLength(1)
    expect(t.wire).toEqual([])
  })

  it("forwards a halt from below once and stops the probe timer", async () => {
    const t = setup({ probeTimeoutMs: 5 })
    t.halt({ type: "close" })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(t.halts).toEqual([{ type: "close" }])
  })

  it("disconnecting stops the probe timer and the socket", async () => {
    const t = setup({ probeTimeoutMs: 5 })
    t.connection.disconnect()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(t.disconnects()).toBe(1)
    expect(t.halts).toEqual([])
  })
})

describe("chainIdentityGate in the ws provider", () => {
  const A = "wss://a.example"
  const B = "wss://b.example"

  it("moves on from an RPC of another chain and sends the request to the next one", async () => {
    const seen: [string, string][] = []
    let connectingUri: string | undefined
    const provider = getWsProvider([A, B], {
      websocketClass: fakeWebSocketClass({ [A]: OTHER_GENESIS, [B]: GENESIS }, seen) as never,
      middleware: chainIdentityGate({
        networkId: NETWORK,
        genesisHash: GENESIS,
        getUri: () => connectingUri,
      }),
      onStatusChanged: (status) => {
        if (status.type === WsEvent.CONNECTING) connectingUri = status.uri
      },
    })

    const response = await new Promise<Msg>((resolve) => {
      const connection = provider((message) => {
        resolve(message)
        connection.disconnect()
      })
      connection.send({ jsonrpc: "2.0", id: "1", method: "system_name", params: [] })
    })

    expect(response.result).toBe(`system_name@${B}`)
    expect(seen).toEqual([
      [A, "chain_getBlockHash"],
      [B, "chain_getBlockHash"],
      [B, "system_name"],
    ])
    expect(getIdentityVerdict(NETWORK, A)).toBe("mismatch")
    expect(getIdentityVerdict(NETWORK, B)).toBe("match")
  })
})
