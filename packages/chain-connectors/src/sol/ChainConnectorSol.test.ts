import { describe, expect, it } from "vitest"
import { ChainConnectorSolStub } from "./ChainConnectorSolStub"
import { getSolRpc, getSolTransport } from "./getSolRpc"

describe("getSolRpc", () => {
  it("creates a kit Rpc exposing pending RPC calls", () => {
    const rpc = getSolRpc("solana", ["https://rpc.example.com"])

    // kit Rpc is a plain object proxy: every method returns a { send } pending request
    const pending = rpc.getBalance(
      "5xJvx7YrqCqgyzxx4PQXt1AVbxioUsGABf2zevmYC8UL" as Parameters<typeof rpc.getBalance>[0]
    )
    expect(typeof pending.send).toBe("function")
  })

  it("creates a transport function", () => {
    const transport = getSolTransport("solana", ["https://rpc.example.com"])
    expect(typeof transport).toBe("function")
  })
})

describe("ChainConnectorSolStub", () => {
  it("creates a kit rpc from a network object", async () => {
    const network = { id: "solana" as const, rpcs: ["https://rpc.example.com"] }
    const stub = new ChainConnectorSolStub(network)
    const rpc = await stub.getRpc()

    expect(typeof rpc.getBalance).toBe("function")
  })

  it("getRpc() returns the same rpc each time", async () => {
    const network = { id: "solana" as const, rpcs: ["https://rpc.example.com"] }
    const stub = new ChainConnectorSolStub(network)

    const rpc1 = await stub.getRpc()
    const rpc2 = await stub.getRpc()
    expect(rpc1).toBe(rpc2)
  })
})
