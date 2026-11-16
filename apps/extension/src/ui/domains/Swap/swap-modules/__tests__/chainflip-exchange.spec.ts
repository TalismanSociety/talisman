import { vi } from "vitest"
import type { QuoteLeg, SwapExchange, SwapTransactionContext } from "../common.swap-module"
import { bindChainflipModule, chainflipTestEnv } from "./chainflip-test-env"

// Chaindata and the slippage setting reach the module through its env
const mockTokensMap = vi.fn()
const mockNetworks = vi.fn()
const mockSlippage = vi.fn()
const env = chainflipTestEnv({
  getTokensMap: async () => mockTokensMap(),
  getNetworks: async () => mockNetworks(),
  getSlippageDecimal: async () => mockSlippage(),
})

const mockBuildDepositTransaction = vi.fn()
vi.mock("../deposit-swap-transactions", () => ({
  estimateDepositGas: vi.fn(async () => null),
  buildDepositTransaction: (...args: unknown[]) => mockBuildDepositTransaction(...args),
}))

vi.mock("@common/chainflip", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@common/chainflip")>()),
  getChainflipApiKey: () => "test-api-key",
}))

// --- Test helpers ---

const USDC_ETH = "1:evm-erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
const DOT_HUB = "polkadot-asset-hub:substrate-native"

const assets = [
  {
    id: "usdc.eth",
    ticker: "USDC",
    name: "USD Coin",
    network: "Ethereum",
    contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    direction: "both" as const,
    enabled: true,
    assetLogo: "/assets/usdc.eth/logo.svg",
    minimalAmount: 20,
    minimalAmountNative: "20000000",
  },
  {
    id: "dot.hub",
    ticker: "DOT",
    name: "Polkadot",
    network: "Assethub",
    decimals: 10,
    direction: "both" as const,
    enabled: true,
    assetLogo: "/assets/dot.hub/logo.svg",
    minimalAmount: 4,
    minimalAmountNative: "40000000000",
  },
]

const quoteResponse = [
  {
    type: "regular",
    ingressAsset: "usdc.eth",
    ingressAmount: 100,
    ingressAmountNative: "100000000",
    egressAsset: "dot.hub",
    egressAmount: 121.0875269317,
    egressAmountNative: "1210875269317",
    includedFees: [
      { type: "broker", asset: "usdc.eth", amount: 1.541432, amountNative: "1541432" },
    ],
    recommendedSlippageTolerancePercent: 1,
    recommendedRetryDurationInBlocks: 50,
    lowLiquidityWarning: false,
    estimatedDurationSeconds: 163.5,
    estimatedPrice: 1.21,
  },
]

// Trimmed from the documented /swap response shape.
const channelResponse = {
  id: 42,
  address: "0x1234567890123456789012345678901234567890",
  issuedBlock: 1504251,
  network: "Ethereum",
  channelId: 107,
  sourceExpiryBlock: 850819,
  explorerUrl: "https://scan.chainflip.io/channels/1504251-Ethereum-107",
  channelOpeningFee: 0,
  channelOpeningFeeNative: "0",
}

const knownToken = (id: string, symbol: string, decimals: number) => ({
  id,
  name: symbol,
  symbol,
  decimals,
  logo: "https://chaindata.example/logo.svg",
})

const stubFetch = (
  swapResult: { ok: boolean; status?: number; body?: unknown },
  quotes: unknown = quoteResponse
) => {
  const fetchMock = vi.fn(async (input: URL | string) => {
    const url = input.toString()
    if (url.includes("/assets")) return { ok: true, json: async () => ({ assets }) }
    if (url.includes("/quotes")) return { ok: true, status: 200, json: async () => quotes }
    return {
      ok: swapResult.ok,
      status: swapResult.status ?? 200,
      json: async () => swapResult.body,
    }
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const freshApi = async () => {
  vi.resetModules()
  const api = await import("../chainflip-swap-module")
  return {
    ...api,
    chainflipSwapModule: bindChainflipModule(api.chainflipSwapModule, env),
  }
}

const swapUrlFrom = (fetchMock: { mock: { calls: [URL | string, ...unknown[]][] } }) =>
  new URL(fetchMock.mock.calls.map(([input]) => input.toString()).find((u) => u.includes("/swap"))!)

const exchangeParams = {
  fromTokenId: USDC_ETH,
  toTokenId: DOT_HUB,
  fromAmount: 100_000_000n,
  fromAddress: "0xabcdef0000000000000000000000000000000000",
  toAddress: "0xfedcba0000000000000000000000000000000000",
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  mockBuildDepositTransaction.mockReset()
  mockSlippage.mockReset()
  mockSlippage.mockResolvedValue(0.005)
  mockNetworks.mockReturnValue([])
  mockTokensMap.mockReturnValue({
    [USDC_ETH]: knownToken(USDC_ETH, "USDC", 6),
    [DOT_HUB]: knownToken(DOT_HUB, "DOT", 10),
  })
})

describe("Chainflip createExchange", () => {
  it("opens a deposit channel with the documented parameters", async () => {
    const fetchMock = stubFetch({ ok: true, body: channelResponse })
    const api = await freshApi()

    await api.chainflipSwapModule.createExchange(exchangeParams)

    const url = swapUrlFrom(fetchMock)
    expect(url.searchParams.get("sourceAsset")).toBe("usdc.eth")
    expect(url.searchParams.get("destinationAsset")).toBe("dot.hub")
    expect(url.searchParams.get("destinationAddress")).toBe(exchangeParams.toAddress)
    expect(url.searchParams.get("refundAddress")).toBe(exchangeParams.fromAddress)
    // Chainflip's recommendation from the fresh quote, not a hardcoded window
    expect(url.searchParams.get("retryDurationInBlocks")).toBe("50")
    // The channel is what earns the commission, so it must carry the override too
    expect(url.searchParams.get("commissionBps")).toBe("60")
  })

  it("opens a regular channel, with no chunking, when only a regular quote exists", async () => {
    const fetchMock = stubFetch({ ok: true, body: channelResponse })
    const api = await freshApi()

    await api.chainflipSwapModule.createExchange(exchangeParams)

    expect(swapUrlFrom(fetchMock).searchParams.has("numberOfChunks")).toBe(false)
    expect(swapUrlFrom(fetchMock).searchParams.has("chunkIntervalBlocks")).toBe(false)
  })

  it("carries the DCA split onto the channel, preferring DCA over regular", async () => {
    const dca = [
      ...quoteResponse,
      { ...quoteResponse[0], type: "dca", numberOfChunks: 50, chunkIntervalBlocks: 1 },
    ]
    const fetchMock = stubFetch({ ok: true, body: channelResponse }, dca)
    const api = await freshApi()

    await api.chainflipSwapModule.createExchange(exchangeParams)

    const url = swapUrlFrom(fetchMock)
    expect(url.searchParams.get("numberOfChunks")).toBe("50")
    expect(url.searchParams.get("chunkIntervalBlocks")).toBe("1")
  })

  it("refuses a DCA quote that does not say how to split", async () => {
    stubFetch({ ok: true, body: channelResponse }, [{ ...quoteResponse[0], type: "dca" }])
    const api = await freshApi()

    await expect(api.chainflipSwapModule.createExchange(exchangeParams)).rejects.toThrow(
      "without its chunking"
    )
  })

  it("falls back to 150 blocks when the quote has no retry duration", async () => {
    const fetchMock = stubFetch({ ok: true, body: channelResponse }, [
      { ...quoteResponse[0], recommendedRetryDurationInBlocks: null },
    ])
    const api = await freshApi()

    await api.chainflipSwapModule.createExchange(exchangeParams)

    expect(swapUrlFrom(fetchMock).searchParams.get("retryDurationInBlocks")).toBe("150")
  })

  it("derives minimumPrice from the fresh estimated price and the slippage setting", async () => {
    const fetchMock = stubFetch({ ok: true, body: channelResponse })
    const api = await freshApi()

    await api.chainflipSwapModule.createExchange(exchangeParams)

    // 1.21 * (1 - 0.005)
    expect(Number(swapUrlFrom(fetchMock).searchParams.get("minimumPrice"))).toBeCloseTo(
      1.203_95,
      10
    )
  })

  it("never puts a NaN minimum price on the wire", async () => {
    stubFetch({ ok: true, body: channelResponse })
    mockSlippage.mockResolvedValue(Number.NaN)
    const api = await freshApi()

    await expect(api.chainflipSwapModule.createExchange(exchangeParams)).rejects.toThrow(
      "Could not compute a minimum price"
    )
  })

  it("carries the quoted deposit amount alongside the channel", async () => {
    stubFetch({ ok: true, body: channelResponse })
    const api = await freshApi()

    const exchange = await api.chainflipSwapModule.createExchange(exchangeParams)

    expect(exchange?.protocol).toBe("chainflip")
    expect(exchange?.data).toEqual({
      // The channel key, which flows into txInfo as exchangeId and into the explorer url
      id: "1504251-Ethereum-107",
      address: channelResponse.address,
      depositAmount: "100",
      sourceExpiryBlock: channelResponse.sourceExpiryBlock,
    })
  })

  it("reports a per-feature 503 as its own error, not as a quote failure", async () => {
    stubFetch({ ok: false, status: 503, body: {} })
    const api = await freshApi()

    await expect(api.chainflipSwapModule.createExchange(exchangeParams)).rejects.toThrow(
      "cannot open a deposit channel right now"
    )
  })

  it("rejects a channel opened on the wrong network", async () => {
    stubFetch({ ok: true, body: { ...channelResponse, network: "Arbitrum" } })
    const api = await freshApi()

    await expect(api.chainflipSwapModule.createExchange(exchangeParams)).rejects.toThrow(
      "wrong network"
    )
  })

  it("requires both addresses", async () => {
    stubFetch({ ok: true, body: channelResponse })
    const api = await freshApi()

    await expect(
      api.chainflipSwapModule.createExchange({ ...exchangeParams, toAddress: null })
    ).rejects.toThrow("Missing to address")
  })
})

/** The quoted leg the confirm screen hands to buildLeg, spending `input` from `signer`. */
const buildLegParams = (
  fromTokenId: string,
  input: bigint,
  signer: string,
  exchange: SwapExchange | null,
  context: SwapTransactionContext
) => {
  const leg: QuoteLeg = {
    protocol: "chainflip",
    fromTokenId,
    toTokenId: fromTokenId === DOT_HUB ? USDC_ETH : DOT_HUB,
    signer,
    recipient: exchangeParams.toAddress,
    inputAmount: input,
    outputAmount: 1210875269317n,
    fees: [],
    timeInSec: 164,
  }
  return { leg, input, context, exchange, slippage: 0.005 }
}

describe("Chainflip buildLeg", () => {
  it("delegates to the shared deposit builder with the channel address and amount", async () => {
    stubFetch({ ok: true, body: channelResponse })
    mockBuildDepositTransaction.mockResolvedValue({ platform: "ethereum", transaction: {} })
    const api = await freshApi()

    const exchange = await api.chainflipSwapModule.createExchange(exchangeParams)
    const context = { platform: "ethereum" as const }
    const built = await api.chainflipSwapModule.buildLeg(
      buildLegParams(
        USDC_ETH,
        exchangeParams.fromAmount,
        exchangeParams.fromAddress,
        exchange,
        context
      )
    )

    expect(built.transaction).toEqual({ platform: "ethereum", transaction: {} })
    expect(mockBuildDepositTransaction).toHaveBeenCalledWith(
      env,
      expect.objectContaining({
        fromAddress: exchangeParams.fromAddress,
        deposit: { depositAddress: channelResponse.address, depositAmount: "100" },
        context,
      })
    )
  })

  it("records the deposit channel key as the tx exchangeId", async () => {
    stubFetch({ ok: true, body: channelResponse })
    mockBuildDepositTransaction.mockResolvedValue({ platform: "ethereum", transaction: {} })
    const api = await freshApi()

    const exchange = await api.chainflipSwapModule.createExchange(exchangeParams)
    const built = await api.chainflipSwapModule.buildLeg(
      buildLegParams(USDC_ETH, exchangeParams.fromAmount, exchangeParams.fromAddress, exchange, {
        platform: "ethereum",
      })
    )

    // The channel key, not Chainflip's nullable swap id: status polling and the explorer use it
    expect(built.txInfo).toEqual({
      type: "swap-chainflip",
      exchangeId: "1504251-Ethereum-107",
      fromTokenId: USDC_ETH,
      toTokenId: DOT_HUB,
      fromAmount: "100000000",
      toAmount: "1210875269317",
      to: exchangeParams.toAddress,
    })
  })

  it("refuses to deposit more than the leg spends", async () => {
    stubFetch({ ok: true, body: channelResponse })
    const api = await freshApi()

    const exchange = await api.chainflipSwapModule.createExchange(exchangeParams)
    await expect(
      api.chainflipSwapModule.buildLeg(
        buildLegParams(USDC_ETH, 99_000_000n, exchangeParams.fromAddress, exchange, {
          platform: "ethereum",
        })
      )
    ).rejects.toThrow("Quote changed")
    expect(mockBuildDepositTransaction).not.toHaveBeenCalled()
  })

  it("passes an asset carrying the fields the substrate branch needs", async () => {
    stubFetch({ ok: true, body: { ...channelResponse, network: "Assethub" } })
    mockBuildDepositTransaction.mockResolvedValue({ platform: "polkadot", payload: {} })
    const api = await freshApi()

    await api.chainflipSwapModule.buildLeg(
      buildLegParams(
        DOT_HUB,
        100_000_000_000n,
        "5abc",
        {
          protocol: "chainflip",
          data: {
            id: "1504251-Assethub-107",
            address: "5deposit",
            depositAmount: "10",
            sourceExpiryBlock: 850819,
          },
        },
        { platform: "polkadot", sapi: {} as never }
      )
    )

    expect(mockBuildDepositTransaction).toHaveBeenCalledWith(
      env,
      expect.objectContaining({
        fromAsset: expect.objectContaining({
          platform: "polkadot",
          chainId: "polkadot-asset-hub",
          decimals: 10,
        }),
      })
    )
  })

  it("passes a solana asset with its mint address, case preserved", async () => {
    const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    const solTokenId = `solana-mainnet:sol-spl:${mint}`
    mockTokensMap.mockReturnValue({
      [solTokenId]: knownToken(solTokenId, "USDC", 6),
    })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          assets: [
            {
              id: "usdc.sol",
              ticker: "USDC",
              name: "USD Coin",
              network: "Solana",
              contractAddress: mint,
              decimals: 6,
              direction: "both",
              enabled: true,
              assetLogo: "/assets/usdc.sol/logo.svg",
            },
          ],
        }),
      }))
    )
    mockBuildDepositTransaction.mockResolvedValue({ platform: "solana", transaction: {} })
    const api = await freshApi()

    await api.chainflipSwapModule.buildLeg(
      buildLegParams(
        solTokenId,
        10_000_000n,
        "SoLsender1111111111111111111111111111111111",
        {
          protocol: "chainflip",
          data: {
            id: "1504251-Solana-107",
            address: "SoLdeposit111",
            depositAmount: "10",
            sourceExpiryBlock: 850819,
          },
        },
        { platform: "solana", rpc: {} as never }
      )
    )

    expect(mockBuildDepositTransaction).toHaveBeenCalledWith(
      env,
      expect.objectContaining({
        fromAsset: expect.objectContaining({
          platform: "solana",
          chainId: "solana-mainnet",
          // base58 is case sensitive — a lowercased mint would not resolve
          contractAddress: mint,
          decimals: 6,
        }),
        context: { platform: "solana", rpc: {} },
      })
    )
  })

  it("throws when the exchange is missing", async () => {
    stubFetch({ ok: true, body: channelResponse })
    const api = await freshApi()
    await api.chainflipSwapModule.getFromAssets(new AbortController().signal)

    await expect(
      api.chainflipSwapModule.buildLeg(
        buildLegParams(USDC_ETH, exchangeParams.fromAmount, exchangeParams.fromAddress, null, {
          platform: "ethereum",
        })
      )
    ).rejects.toThrow("Missing exchange")
  })
})

describe("Chainflip module shape", () => {
  it("implements the contract and deliberately omits getApprovalInfo", async () => {
    const api = await freshApi()

    expect(api.chainflipSwapModule.protocol).toBe("chainflip")
    expect(api.chainflipSwapModule.decentralisationScore).toBe(1.75)
    expect(api.chainflipSwapModule.supportsSlippageSetting).toBe(true)
    // Deposit channels are funded by a plain transfer — there is no allowance to grant
    expect(api.chainflipSwapModule.getApprovalInfo).toBeUndefined()
  })
})
