import { describe, expect, it, vi } from "vitest"
import { ChainConnectorSol } from "./ChainConnectorSol"
import { ChainConnectorSolStub } from "./ChainConnectorSolStub"

describe("ChainConnectorSol", () => {
  const makeChaindataProvider = () => ({
    getNetworkById: vi.fn(async () => ({ id: "solana", rpcs: ["https://rpc.example.com"] })),
  })

  it("caches the rpc per network", async () => {
    const chaindataProvider = makeChaindataProvider()
    const connector = new ChainConnectorSol(
      chaindataProvider as unknown as ConstructorParameters<typeof ChainConnectorSol>[0]
    )

    const rpc1 = await connector.getRpc("solana")
    const rpc2 = await connector.getRpc("solana")
    expect(rpc1).toBe(rpc2)
    expect(chaindataProvider.getNetworkById).toHaveBeenCalledTimes(1)
  })

  it("clearRpcProvidersCache() re-reads the network's rpcs from chaindata", async () => {
    const chaindataProvider = makeChaindataProvider()
    const connector = new ChainConnectorSol(
      chaindataProvider as unknown as ConstructorParameters<typeof ChainConnectorSol>[0]
    )

    const rpc1 = await connector.getRpc("solana")
    connector.clearRpcProvidersCache("solana")
    const rpc2 = await connector.getRpc("solana")

    expect(rpc1).not.toBe(rpc2)
    expect(chaindataProvider.getNetworkById).toHaveBeenCalledTimes(2)
  })
})

describe("ChainConnectorSolStub", () => {
  it("getRpc() returns the same rpc each time", async () => {
    const network = { id: "solana" as const, rpcs: ["https://rpc.example.com"] }
    const stub = new ChainConnectorSolStub(network)

    const rpc1 = await stub.getRpc()
    const rpc2 = await stub.getRpc()
    expect(rpc1).toBe(rpc2)
  })
})
