import { vi } from "vitest"
import { bindChainflipModule, chainflipTestEnv } from "./chainflip-test-env"

// Chaindata reaches the module through its env
const mockTokensMap = vi.fn()
const env = chainflipTestEnv({ getTokensMap: async () => mockTokensMap() })

// --- Test helpers ---

type ApiAsset = {
  id: string
  ticker: string
  name: string
  network: string
  contractAddress?: string
  decimals: number
  direction: "ingress" | "egress" | "both"
  enabled: boolean
  assetLogo: string
  minimalAmount?: number
  minimalAmountNative?: string
}

const apiAsset = (partial: Partial<ApiAsset> & Pick<ApiAsset, "id" | "network">): ApiAsset => ({
  ticker: "TKN",
  name: "Token",
  decimals: 6,
  direction: "both",
  enabled: true,
  assetLogo: `/assets/${partial.id}/logo.svg`,
  ...partial,
})

const knownToken = (id: string) => ({
  id,
  name: "Chaindata Name",
  symbol: "CDN",
  decimals: 6,
  logo: "https://chaindata.example/logo.svg",
})

const setup = (assets: ApiAsset[], tokenIds: string[]) => {
  mockTokensMap.mockReturnValue(Object.fromEntries(tokenIds.map((id) => [id, knownToken(id)])))
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ assets }) }))
  )
}

// The module caches its asset promise, so each test needs a fresh module instance.
const freshApi = async () => {
  vi.resetModules()
  const api = await import("../chainflip-swap-module")
  return {
    ...api,
    chainflipSwapModule: bindChainflipModule(api.chainflipSwapModule, env),
  }
}

const signal = new AbortController().signal

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
})

describe("Chainflip asset mapping", () => {
  it("maps Assethub USDC to a substrate-assets tokenId, not to native DOT", async () => {
    const tokenId = "polkadot-asset-hub:substrate-assets:1337"
    setup([apiAsset({ id: "usdc.hub", network: "Assethub", contractAddress: "1337" })], [tokenId])
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual([tokenId])
    expect(api.resolveChainflipAsset(tokenId)?.assetHubAssetId).toBe("1337")
    expect(api.resolveChainflipAsset(tokenId)?.contractAddress).toBeUndefined()
  })

  it("maps Assethub DOT to the native tokenId", async () => {
    const tokenId = "polkadot-asset-hub:substrate-native"
    setup([apiAsset({ id: "dot.hub", network: "Assethub", decimals: 10 })], [tokenId])
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual([tokenId])
    expect(api.resolveChainflipAsset(tokenId)?.assetHubAssetId).toBeUndefined()
  })

  it("lowercases EVM contract addresses", async () => {
    const tokenId = "1:evm-erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    setup(
      [
        apiAsset({
          id: "usdc.eth",
          network: "Ethereum",
          contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        }),
      ],
      [tokenId]
    )
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual([tokenId])
  })

  it("maps BNB Smart Chain assets", async () => {
    const bnb = "56:evm-native"
    const usdt = "56:evm-erc20:0x55d398326f99059ff775485246999027b3197955"
    setup(
      [
        apiAsset({ id: "bnb.bsc", network: "Bsc", decimals: 18 }),
        apiAsset({
          id: "usdt.bsc",
          network: "Bsc",
          contractAddress: "0x55d398326f99059fF775485246999027B3197955",
          decimals: 18,
        }),
      ],
      [bnb, usdt]
    )
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual([bnb, usdt])
  })

  it("preserves the case of Solana mint addresses", async () => {
    const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    const tokenId = `solana-mainnet:sol-spl:${mint}`
    setup([apiAsset({ id: "usdc.sol", network: "Solana", contractAddress: mint })], [tokenId])
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual([tokenId])
  })

  it("excludes Bitcoin and Tron assets, which Talisman cannot represent", async () => {
    setup(
      [
        apiAsset({ id: "btc.btc", network: "Bitcoin", decimals: 8 }),
        apiAsset({ id: "trx.tron", network: "Tron" }),
        apiAsset({
          id: "usdt.tron",
          network: "Tron",
          contractAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        }),
        apiAsset({ id: "eth.eth", network: "Ethereum", decimals: 18 }),
      ],
      ["1:evm-native"]
    )
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual(["1:evm-native"])
  })

  it("skips assets chaindata does not know instead of advertising them", async () => {
    setup(
      [
        apiAsset({
          id: "flip.eth",
          network: "Ethereum",
          contractAddress: "0x826180541412D574cf1336d22c0C0a287822678A",
          decimals: 18,
        }),
        apiAsset({ id: "eth.eth", network: "Ethereum", decimals: 18 }),
      ],
      ["1:evm-native"]
    )
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual(["1:evm-native"])
  })

  it("skips disabled assets", async () => {
    setup(
      [apiAsset({ id: "eth.eth", network: "Ethereum", decimals: 18, enabled: false })],
      ["1:evm-native"]
    )
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual([])
  })

  it("honours direction: ingress-only assets are not offered as a destination", async () => {
    setup(
      [
        apiAsset({ id: "eth.eth", network: "Ethereum", decimals: 18, direction: "ingress" }),
        apiAsset({ id: "sol.sol", network: "Solana", decimals: 9, direction: "egress" }),
      ],
      ["1:evm-native", "solana-mainnet:sol-native"]
    )
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual(["1:evm-native"])
    expect(await api.chainflipSwapModule.getToAssets(null, signal)).toEqual([
      "solana-mainnet:sol-native",
    ])
  })

  it("excludes the selected source from its own destination list", async () => {
    setup(
      [
        apiAsset({ id: "eth.eth", network: "Ethereum", decimals: 18 }),
        apiAsset({ id: "sol.sol", network: "Solana", decimals: 9 }),
      ],
      ["1:evm-native", "solana-mainnet:sol-native"]
    )
    const api = await freshApi()

    expect(await api.chainflipSwapModule.getToAssets("1:evm-native", signal)).toEqual([
      "solana-mainnet:sol-native",
    ])
  })

  it("keeps the Chainflip asset id and minimum on the cached asset", async () => {
    setup(
      [
        apiAsset({
          id: "usdc.eth",
          network: "Ethereum",
          contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          minimalAmount: 20,
          minimalAmountNative: "20000000",
        }),
      ],
      ["1:evm-erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"]
    )
    const api = await freshApi()
    await api.chainflipSwapModule.getFromAssets(signal)

    const asset = api.resolveChainflipAsset(
      "1:evm-erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    )
    expect(asset?.context.chainflip.assetId).toBe("usdc.eth")
    expect(asset?.context.chainflip.minimalAmount).toBe(20)
    expect(asset?.context.chainflip.minimalAmountNative).toBe("20000000")
  })

  it("clears the cache when the fetch fails, so a later call retries", async () => {
    const api = await freshApi()
    mockTokensMap.mockReturnValue({ "1:evm-native": knownToken("1:evm-native") })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ assets: [apiAsset({ id: "eth.eth", network: "Ethereum" })] }),
      })
    vi.stubGlobal("fetch", fetchMock)

    await expect(api.chainflipSwapModule.getFromAssets(signal)).rejects.toThrow("503")
    expect(await api.chainflipSwapModule.getFromAssets(signal)).toEqual(["1:evm-native"])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
