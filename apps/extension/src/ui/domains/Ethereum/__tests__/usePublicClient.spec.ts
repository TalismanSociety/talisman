import type { EthNetwork } from "@talismn/chaindata-provider"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockEthRequest = vi.fn()

vi.mock("@ui/api", () => ({
  api: {
    ethRequest: (...args: unknown[]) => mockEthRequest(...args),
  },
}))

vi.mock("@ui/state/chaindata", () => ({
  useNetworkById: vi.fn(),
}))

import { getExtensionPublicClient } from "../usePublicClient"

const arbitrum = {
  id: "42161",
  name: "Arbitrum One",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
} as unknown as EthNetwork

const rpcResponses: Record<string, unknown> = {
  eth_getBlockByNumber: {
    number: "0x1",
    hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
    parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    baseFeePerGas: "0x5f5e100",
    gasLimit: "0x1c9c380",
    gasUsed: "0x0",
    timestamp: "0x0",
    transactions: [],
  },
  eth_chainId: "0xa4b1",
  eth_maxPriorityFeePerGas: "0xf4240",
  eth_estimateGas: "0xf758",
  eth_getTransactionCount: "0x1",
}

describe("getExtensionPublicClient", () => {
  beforeEach(() => {
    mockEthRequest.mockReset()
    mockEthRequest.mockImplementation(({ method }: { method: string }) => {
      if (method === "eth_fillTransaction")
        return Promise.reject({ code: 3, message: "execution reverted" })
      if (method in rpcResponses) return Promise.resolve(rpcResponses[method])
      return Promise.reject(new Error(`Unexpected method: ${method}`))
    })
  })

  it("prepares transaction requests without calling eth_fillTransaction", async () => {
    const client = getExtensionPublicClient(arbitrum)

    const request = await client.prepareTransactionRequest({
      account: "0x57e0f193e5d6bae01317383caa2f3f2264990cf0",
      to: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      data: "0xa9059cbb0000000000000000000000008020fadf2a9e3a4f6ddd622e968a4b9053a0019000000000000000000000000000000000000000000000000000000086fc36f06",
      value: 0n,
      chain: null,
    })

    const calledMethods = mockEthRequest.mock.calls.map(([arg]) => arg.method)
    expect(calledMethods).not.toContain("eth_fillTransaction")
    expect(request.gas).toBe(0xf758n)
    expect(request.nonce).toBe(1)
    expect(request.maxFeePerGas).toBeDefined()
  })
})
