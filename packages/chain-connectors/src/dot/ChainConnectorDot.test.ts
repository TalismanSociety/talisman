import type { DotNetwork, IChaindataNetworkProvider } from "@talismn/chaindata-provider"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getIdentityVerdict } from "../rpcIdentity"
import { fakeWebSocketClass } from "./__fixtures__/fakeWebSocket"
import { ChainConnectorDot } from "./ChainConnectorDot"
import { ChainConnectorDotStub } from "./ChainConnectorDotStub"

const GENESIS = "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
const OTHER_GENESIS = "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe"

const A = "wss://a.example"
const B = "wss://b.example"

// verdicts last for the process: each test gets a network of its own
let n = 0
const makeNetwork = () => ({
  id: `dot-connector-test-${n++}`,
  platform: "polkadot" as const,
  genesisHash: GENESIS,
  rpcs: [A, B],
})

const stubWebSocket = () => {
  const seen: [string, string][] = []
  vi.stubGlobal("WebSocket", fakeWebSocketClass({ [A]: OTHER_GENESIS, [B]: GENESIS }, seen))
  return seen
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ChainConnectorDot chain identity", () => {
  it("skips an RPC of another chain and sends the request to the next one", async () => {
    const seen = stubWebSocket()
    const network = makeNetwork()
    const connector = new ChainConnectorDot({
      getNetworkById: async () => network,
    } as unknown as IChaindataNetworkProvider)

    await expect(connector.send(network.id, "system_name", [])).resolves.toBe(`system_name@${B}`)
    expect(seen.filter(([url]) => url === A)).toEqual([[A, "chain_getBlockHash"]])
    expect(seen.filter(([url]) => url === B)).toEqual([
      [B, "chain_getBlockHash"],
      [B, "system_name"],
    ])
    expect(getIdentityVerdict(network.id, A)).toBe("mismatch")
    expect(getIdentityVerdict(network.id, B)).toBe("match")
  })

  it("leaves an RPC known to serve another chain out of a new connection", async () => {
    const seen = stubWebSocket()
    const network = makeNetwork()
    const connector = new ChainConnectorDot({
      getNetworkById: async () => network,
    } as unknown as IChaindataNetworkProvider)

    await connector.send(network.id, "system_name", [])
    // the last user released the connection, so this one is new
    await connector.send(network.id, "system_chain", [])
    expect(seen.filter(([url]) => url === A)).toHaveLength(1)
    expect(seen.filter(([url]) => url === B).map(([, method]) => method)).toEqual([
      "chain_getBlockHash",
      "system_name",
      "system_chain",
    ])
  })

  it("sends a subscription only to an RPC of the chain", async () => {
    const seen = stubWebSocket()
    const network = makeNetwork()
    const connector = new ChainConnectorDot({
      getNetworkById: async () => network,
    } as unknown as IChaindataNetworkProvider)

    const callback = vi.fn()
    const unsubscribe = await connector.subscribe(
      network.id,
      "chain_subscribeNewHeads",
      "chain_newHead",
      [],
      callback
    )
    await vi.waitFor(() => expect(seen).toContainEqual([B, "chain_subscribeNewHeads"]))
    unsubscribe("chain_unsubscribeNewHeads")
    expect(seen.filter(([url]) => url === A)).toEqual([[A, "chain_getBlockHash"]])
    expect(callback).not.toHaveBeenCalled()
  })
})

describe("ChainConnectorDotStub chain identity", () => {
  it("skips an RPC of another chain", async () => {
    const seen = stubWebSocket()
    const stub = new ChainConnectorDotStub(makeNetwork() as DotNetwork)

    await expect(stub.send("", "system_name", [])).resolves.toBe(`system_name@${B}`)
    expect(seen.filter(([url]) => url === A)).toEqual([[A, "chain_getBlockHash"]])
    stub.destroy()
  })
})
