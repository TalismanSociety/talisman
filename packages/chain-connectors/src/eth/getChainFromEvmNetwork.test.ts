import type { EthNetwork } from "@talismn/chaindata-provider"

import { clearChainsCache, getChainFromEvmNetwork } from "./getChainFromEvmNetwork"

const makeEthNetwork = (overrides: Partial<EthNetwork> = {}): EthNetwork =>
  ({
    id: "1",
    name: "Ethereum",
    platform: "ethereum",
    nativeCurrency: { symbol: "ETH", decimals: 18, name: "ETH" },
    nativeTokenId: "1-evm-native",
    rpcs: ["https://eth.example.com"],
    ...overrides,
  }) as EthNetwork

describe("getChainFromEvmNetwork", () => {
  beforeEach(() => {
    clearChainsCache()
  })

  it("converts an EthNetwork to a viem Chain", () => {
    const network = makeEthNetwork()
    const chain = getChainFromEvmNetwork(network)

    expect(chain.id).toBe(1)
    expect(chain.name).toBe("Ethereum")
    expect(chain.nativeCurrency).toEqual({ symbol: "ETH", decimals: 18, name: "ETH" })
  })

  it("sets rpcUrls with public and default transports", () => {
    const network = makeEthNetwork({
      rpcs: ["https://rpc1.example.com", "https://rpc2.example.com"],
    })
    const chain = getChainFromEvmNetwork(network)

    expect(chain.rpcUrls.public.http).toEqual([
      "https://rpc1.example.com",
      "https://rpc2.example.com",
    ])
    expect(chain.rpcUrls.default.http).toEqual([
      "https://rpc1.example.com",
      "https://rpc2.example.com",
    ])
  })

  it("returns cached result for the same network id", () => {
    const network = makeEthNetwork()
    const chain1 = getChainFromEvmNetwork(network)
    const chain2 = getChainFromEvmNetwork(network)

    expect(chain1).toBe(chain2)
  })

  it("handles contracts by converting keys to camelCase", () => {
    const network = makeEthNetwork({
      id: "99999",
      contracts: {
        Multicall3: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
        Erc20Aggregator: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`,
      },
    })
    const chain = getChainFromEvmNetwork(network)

    expect(chain.contracts?.multicall3).toEqual({
      address: "0x1234567890abcdef1234567890abcdef12345678",
    })
    expect(chain.contracts?.erc20Aggregator).toEqual({
      address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    })
  })

  it("falls back to 'Ethereum Chain {id}' when name is missing", () => {
    const network = makeEthNetwork({ id: "42161", name: undefined as unknown as string })
    const chain = getChainFromEvmNetwork(network)

    expect(chain.name).toBe("Ethereum Chain 42161")
  })

  it("handles network with no rpcs (defaults to empty array)", () => {
    const network = makeEthNetwork({ rpcs: undefined as unknown as string[] })
    const chain = getChainFromEvmNetwork(network)

    expect(chain.rpcUrls.default.http).toEqual([])
  })

  describe("clearChainsCache", () => {
    it("clears all cached chains when called without args", () => {
      const network1 = makeEthNetwork({ id: "1" })
      const network2 = makeEthNetwork({ id: "2" })

      const chain1a = getChainFromEvmNetwork(network1)
      const chain2a = getChainFromEvmNetwork(network2)

      clearChainsCache()

      const chain1b = getChainFromEvmNetwork(network1)
      const chain2b = getChainFromEvmNetwork(network2)

      expect(chain1a).not.toBe(chain1b)
      expect(chain2a).not.toBe(chain2b)
    })

    it("clears only the specific network when called with an id", () => {
      const network1 = makeEthNetwork({ id: "1" })
      const network2 = makeEthNetwork({ id: "2" })

      const chain1a = getChainFromEvmNetwork(network1)
      const chain2a = getChainFromEvmNetwork(network2)

      clearChainsCache("1")

      const chain1b = getChainFromEvmNetwork(network1)
      const chain2b = getChainFromEvmNetwork(network2)

      expect(chain1a).not.toBe(chain1b) // cleared
      expect(chain2a).toBe(chain2b) // still cached
    })
  })
})
