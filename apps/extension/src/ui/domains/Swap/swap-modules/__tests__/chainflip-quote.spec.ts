import BigNumber from "bignumber.js"
import { vi } from "vitest"
import type { QuoteParams } from "../common.swap-module"
import { bindChainflipModule, chainflipTestEnv } from "./chainflip-test-env"

// Chaindata reaches the module through its env
const mockTokensMap = vi.fn()
const env = chainflipTestEnv({ getTokensMap: async () => mockTokensMap() })

const mockEstimateDepositGas = vi.fn()
vi.mock("../deposit-swap-transactions", () => ({
  estimateDepositGas: (...args: unknown[]) => mockEstimateDepositGas(...args),
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

// Trimmed from a real 2026-08-10 response for 100 usdc.eth -> dot.hub.
const quoteResponse = [
  {
    type: "regular",
    ingressAsset: "usdc.eth",
    ingressAmount: 100,
    ingressAmountNative: "100000000",
    egressAsset: "dot.hub",
    egressAmount: 122.9421113283,
    egressAmountNative: "1229421113283",
    includedFees: [
      { type: "ingress", asset: "usdc.eth", amount: 0.044933, amountNative: "44933" },
      { type: "network", asset: "usdc.eth", amount: 0.5, amountNative: "500000" },
      { type: "broker", asset: "usdc.eth", amount: 0.049728, amountNative: "49728" },
      { type: "egress", asset: "dot.hub", amount: 0.019745, amountNative: "197450000" },
      { type: "liquidity", asset: "usdc.eth", amount: 0, amountNative: "0" },
    ],
    recommendedSlippageTolerancePercent: 1,
    lowLiquidityWarning: false,
    estimatedDurationSeconds: 163.5,
    estimatedDurationsSeconds: { deposit: 60, swap: 12, egress: 91.5 },
    estimatedPrice: 1.2301713161604904,
  },
]

const knownToken = (id: string, symbol: string, decimals: number) => ({
  id,
  name: symbol,
  symbol,
  decimals,
  logo: "https://chaindata.example/logo.svg",
})

const stubFetch = (quoteResult: { ok: boolean; status?: number; body?: unknown }) => {
  const fetchMock = vi.fn(async (input: URL | string, init?: RequestInit) => {
    const url = input.toString()
    void init
    if (url.includes("/assets")) return { ok: true, json: async () => ({ assets }) }
    return {
      ok: quoteResult.ok,
      status: quoteResult.status ?? 200,
      json: async () => quoteResult.body,
    }
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const freshApi = async () => {
  vi.resetModules()
  const api = await import("../chainflip-swap-module")
  return { ...api, getQuote: bindChainflipModule(api.chainflipSwapModule, env).getQuote }
}

const signal = new AbortController().signal

const params = (fromAmount: bigint, fromAddress: string | null = null): QuoteParams => ({
  fromTokenId: USDC_ETH,
  toTokenId: DOT_HUB,
  fromAmount,
  fromAddress,
  toAddress: null,
  input: "exact",
})

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  mockEstimateDepositGas.mockReset()
  mockEstimateDepositGas.mockResolvedValue(null)
  mockTokensMap.mockReturnValue({
    [USDC_ETH]: knownToken(USDC_ETH, "USDC", 6),
    [DOT_HUB]: knownToken(DOT_HUB, "DOT", 10),
  })
})

describe("Chainflip getQuote", () => {
  it("builds bigint amounts from the native fields, never from the human decimals", async () => {
    stubFetch({ ok: true, body: quoteResponse })
    const api = await freshApi()

    const quote = await api.getQuote(params(100_000_000n), signal)

    expect(quote?.outputAmountBN).toBe(1229421113283n)
    expect(quote?.inputAmountBN).toBe(100_000_000n)
  })

  it("takes timeInSec from the singular duration field, rounded", async () => {
    stubFetch({ ok: true, body: quoteResponse })
    const api = await freshApi()

    const quote = await api.getQuote(params(100_000_000n), signal)

    // 163.5 total, not the 60 + 12 + 91.5 breakdown re-summed
    expect(quote?.timeInSec).toBe(164)
  })

  it("reports only the broker fee, not the five already netted out of the output", async () => {
    stubFetch({ ok: true, body: quoteResponse })
    const api = await freshApi()

    const quote = await api.getQuote(params(100_000_000n), signal)

    expect(quote?.fees).toHaveLength(1)
    expect(quote?.fees[0]).toMatchObject({ name: "Broker Fee", tokenId: USDC_ETH })
    expect(quote?.fees[0]?.amount.toString()).toBe("0.049728")
  })

  it("adds the deposit gas estimate when an address is known", async () => {
    const gasFee = { name: "Est. Gas Fees", tokenId: "1:evm-native", amount: BigNumber(0.0012) }
    mockEstimateDepositGas.mockResolvedValue(gasFee)
    stubFetch({ ok: true, body: quoteResponse })
    const api = await freshApi()

    const quote = await api.getQuote(params(100_000_000n, "0xabc"), signal)

    expect(quote?.fees.map(({ name }) => name)).toEqual(["Est. Gas Fees", "Broker Fee"])
  })

  it("derives the disclosed rate from the returned broker fee", async () => {
    stubFetch({ ok: true, body: quoteResponse })
    const api = await freshApi()

    const quote = await api.getQuote(params(100_000_000n), signal)

    // 0.049728 / 100 — about 5 bps on this response, whatever the dashboard is set to
    expect(quote?.talismanFee).toBeCloseTo(0.00049728, 10)
  })

  it("sends commissionBps and a human-decimal amount", async () => {
    const fetchMock = stubFetch({ ok: true, body: quoteResponse })
    const api = await freshApi()

    await api.getQuote(params(100_000_000n), signal)

    const quoteUrl = new URL(
      fetchMock.mock.calls.map(([input]) => input.toString()).find((u) => u.includes("/quotes"))!
    )
    expect(quoteUrl.searchParams.get("amount")).toBe("100")
    expect(quoteUrl.searchParams.get("sourceAsset")).toBe("usdc.eth")
    expect(quoteUrl.searchParams.get("destinationAsset")).toBe("dot.hub")
    expect(quoteUrl.searchParams.get("apiKey")).toBe("test-api-key")
    // Must be sent: the credential is configured at 0 bps and billed is max(configured, sent) + 5
    expect(quoteUrl.searchParams.get("commissionBps")).toBe("60")
  })

  it("passes the abort signal through to fetch", async () => {
    const fetchMock = stubFetch({ ok: true, body: quoteResponse })
    const api = await freshApi()

    await api.getQuote(params(100_000_000n), signal)

    const quoteCall = fetchMock.mock.calls.find(([input]) => input.toString().includes("/quotes"))!
    expect(quoteCall[1]?.signal).toBe(signal)
  })

  it("throws a readable minimum before calling the API", async () => {
    const fetchMock = stubFetch({ ok: true, body: quoteResponse })
    const api = await freshApi()

    await expect(api.getQuote(params(1_000_000n), signal)).rejects.toThrow(
      "Chainflip minimum is 20 USDC"
    )
    expect(fetchMock.mock.calls.some(([input]) => input.toString().includes("/quotes"))).toBe(false)
  })

  it("surfaces a below-minimum 400 from the API as a readable minimum", async () => {
    stubFetch({
      ok: false,
      status: 400,
      body: {
        title: "One or more validation errors occurred.",
        status: 400,
        errors: { minimalAmount: ["20"] },
      },
    })
    const api = await freshApi()

    await expect(api.getQuote(params(100_000_000n), signal)).rejects.toThrow(
      "Chainflip minimum is 20 USDC"
    )
  })

  it("surfaces the ProblemDetails detail on any other error", async () => {
    stubFetch({
      ok: false,
      status: 503,
      body: { title: "Service Unavailable", detail: "Chainflip is temporarily unavailable" },
    })
    const api = await freshApi()

    await expect(api.getQuote(params(100_000_000n), signal)).rejects.toThrow(
      "Chainflip is temporarily unavailable"
    )
  })

  it("quotes through DCA when that is the only route Chainflip offers", async () => {
    stubFetch({
      ok: true,
      body: [{ ...quoteResponse[0], type: "dca", egressAmountNative: "999" }],
    })
    const api = await freshApi()

    const quote = await api.getQuote(params(100_000_000n), signal)
    expect(quote?.outputAmountBN).toBe(999n)
  })

  it("prefers the DCA quote when it is offered alongside a regular one", async () => {
    stubFetch({
      ok: true,
      body: [
        { ...quoteResponse[0], type: "regular", egressAmountNative: "111" },
        { ...quoteResponse[0], type: "dca", egressAmountNative: "999" },
      ],
    })
    const api = await freshApi()

    const quote = await api.getQuote(params(100_000_000n), signal)
    expect(quote?.outputAmountBN).toBe(999n)
  })

  it("returns null when either side of the pair is not a Chainflip asset", async () => {
    stubFetch({ ok: true, body: quoteResponse })
    const api = await freshApi()

    const quote = await api.getQuote({ ...params(100_000_000n), toTokenId: "1:evm-native" }, signal)
    expect(quote).toBeNull()
  })
})
