import type { DotNetwork } from "@talismn/chaindata-provider"

import { ChainConnectorDotStub } from "./ChainConnectorDotStub"

describe("ChainConnectorDotStub", () => {
  it("reset() throws an error", () => {
    const network = { rpcs: ["wss://rpc.example.com"] } as unknown as DotNetwork
    const stub = new ChainConnectorDotStub(network)

    expect(() => stub.reset()).toThrow("ChainConnectorDotStub does not implement reset")
  })
})
