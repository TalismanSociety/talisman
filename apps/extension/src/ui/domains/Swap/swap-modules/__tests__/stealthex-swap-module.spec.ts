import BigNumber from "bignumber.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }))

vi.mock("openapi-fetch", () => ({ default: () => ({ GET: mockGet, POST: mockPost }) }))

vi.mock("@core/domains/app/store.remoteConfig", () => ({
  remoteConfigStore: {
    get: vi.fn(async () => ({
      stealthex: {
        networks: { mainnet: "1" },
        tokens: { "mainnet::eth": "1:evm-native", "polkadot::dot": "polkadot:substrate-native" },
      },
    })),
  },
}))

const EVM_NETWORK = { id: "1", platform: "ethereum", nativeTokenId: "1:evm-native" }
const ETH = { id: "1:evm-native", type: "evm-native", decimals: 18, symbol: "ETH", networkId: "1" }
const DOT = {
  id: "polkadot:substrate-native",
  type: "substrate-native",
  decimals: 10,
  symbol: "DOT",
  networkId: "polkadot",
}

vi.mock("@ui/state/chaindata", async () => {
  const { of } = await import("rxjs")
  return {
    getNetworks$: vi.fn(() => of([])),
    getNetworkById$: vi.fn(() => of(EVM_NETWORK)),
    getNetworksMapById$: vi.fn(() => of({ "1": EVM_NETWORK })),
    getToken$: vi.fn(() => of(ETH)),
    getTokensMap$: vi.fn(() => of({ [ETH.id]: ETH, [DOT.id]: DOT })),
  }
})

vi.mock("@ui/state/balances", () => ({ getBalances$: vi.fn() }))

vi.mock("@ui/state/accounts", async () => {
  const { of } = await import("rxjs")
  return { accounts$: of([]) }
})

vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({
  getExtensionPublicClient: vi.fn(() => ({
    getGasPrice: async () => 10_000_000_000n,
    estimateGas: async () => 21_000n,
  })),
}))

vi.mock("../evm-gas-check", () => ({
  prepareTransactionRequestWithGasCheck: vi.fn(
    async (_client: unknown, _feeTokenId: string, request: unknown) => request
  ),
}))

const { stealthexSwapModule: stealthexPageModule } = await import("../stealthex-swap-module")
const { uiSwapEnv, withSwapEnv } = await import("../../swapEnv.ui")
const stealthexSwapModule = withSwapEnv(stealthexPageModule, uiSwapEnv)
const { confirmSwap } = await import("./confirmSwap")

const FROM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const TO_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const DEPOSIT_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const ONE_ETH = 10n ** 18n

const EXCHANGE = {
  id: "stealthex-1",
  deposit: { network: "mainnet", symbol: "eth", address: DEPOSIT_ADDRESS, expected_amount: 0.98 },
  withdrawal: { network: "polkadot", symbol: "dot", address: TO_ADDRESS },
}

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
  mockGet.mockImplementation(async (path: string) => {
    switch (path) {
      case "/v4/currencies":
        return {
          data: [
            { symbol: "eth", network: "mainnet", contract_address: null, icon_url: "" },
            { symbol: "dot", network: "polkadot", contract_address: null, icon_url: "" },
          ],
        }
      case "/v4/currencies/{symbol}/{network}":
        return {
          data: { available_routes: [{ symbol: "dot", network: "polkadot", features: [] }] },
        }
      default:
        throw new Error(`unexpected GET ${path}`)
    }
  })
  mockPost.mockImplementation(async (path: string) => {
    switch (path) {
      case "/v4/rates/range":
        return { data: { min_amount: 0.01 } }
      case "/v4/rates/estimated-amount":
        return { data: { estimated_amount: 250.5 } }
      case "/v4/exchanges":
        return { data: EXCHANGE }
      default:
        throw new Error(`unexpected POST ${path}`)
    }
  })
})

const quoteFor = async (fromAmount: bigint) => {
  const signal = new AbortController().signal
  await stealthexSwapModule.getFromAssets(signal)
  const quote = await stealthexSwapModule.getQuote(
    {
      fromTokenId: ETH.id,
      toTokenId: DOT.id,
      fromAmount,
      fromAddress: FROM_ADDRESS,
      toAddress: TO_ADDRESS,
      input: "exact",
    },
    signal
  )
  if (!quote || Array.isArray(quote)) throw new Error("expected a single quote")
  return quote
}

const confirmFor = async (fromAmount: bigint) =>
  confirmSwap({
    module: stealthexSwapModule,
    quote: await quoteFor(fromAmount),
    fromTokenId: ETH.id,
    toTokenId: DOT.id,
    fromAddress: FROM_ADDRESS,
    toAddress: TO_ADDRESS,
    fromAmount,
    context: { platform: "ethereum" },
  })

/** answers POST /v4/exchanges with an exchange whose deposit is `expectedAmount(body.amount)` */
const exchangeEchoing = (expectedAmount: (sent: number) => number) => {
  const answer = mockPost.getMockImplementation()
  mockPost.mockImplementation(async (path: string, init?: { body: { amount: number } }) =>
    path === "/v4/exchanges" && init
      ? {
          data: {
            ...EXCHANGE,
            deposit: { ...EXCHANGE.deposit, expected_amount: expectedAmount(init.body.amount) },
          },
        }
      : answer?.(path, init)
  )
}

const sentAmounts = () =>
  mockPost.mock.calls
    .filter(([path]) => path === "/v4/exchanges")
    .map(([, init]) => (init as { body: { amount: number } }).body.amount)

describe("stealthexSwapModule confirm screen", () => {
  it("creates one exchange and deposits its expected amount", async () => {
    const quote = await quoteFor(ONE_ETH)
    mockPost.mockClear()

    expect(
      await confirmSwap({
        module: stealthexSwapModule,
        quote,
        fromTokenId: ETH.id,
        toTokenId: DOT.id,
        fromAddress: FROM_ADDRESS,
        toAddress: TO_ADDRESS,
        fromAmount: ONE_ETH,
        context: { platform: "ethereum" },
      })
    ).toEqual({
      transaction: {
        platform: "ethereum",
        transaction: {
          chain: null,
          to: DEPOSIT_ADDRESS,
          value: 980_000_000_000_000_000n,
          account: FROM_ADDRESS,
        },
      },
      fees: [
        { name: "Est. Gas Fees", gas: true, tokenId: ETH.id, amount: BigNumber("0.00021") },
        { name: "Talisman Fee", tokenId: ETH.id, amount: BigNumber("0.006") },
      ],
      txInfo: {
        type: "swap-stealthex",
        exchangeId: "stealthex-1",
        fromTokenId: ETH.id,
        toTokenId: DOT.id,
        fromAmount: "1000000000000000000",
        toAmount: "2505000000000",
        to: TO_ADDRESS,
      },
    })
    expect(mockPost.mock.calls.filter(([path]) => path === "/v4/exchanges")).toHaveLength(1)
  })

  it("deposits the echoed amount, at most the input, for an input with more digits than a double holds", async () => {
    exchangeEchoing((sent) => sent)

    const confirmed = await confirmFor(123_456_789_012_345_678n)

    // the nearest double, 0.12345678901234568, is above the input; the amount sent keeps 15
    // significant digits, rounded down
    expect(sentAmounts()).toEqual([0.123456789012345])
    expect(confirmed.transaction).toMatchObject({
      platform: "ethereum",
      transaction: { to: DEPOSIT_ADDRESS, value: 123_456_789_012_345_000n },
    })
  })

  it("refuses a deposit above the exact input that a comparison of doubles would accept", async () => {
    // 0.123456789012345678 ETH parses to the double 0.12345678901234568, which is above it
    exchangeEchoing(() => 0.12345678901234568)

    await expect(confirmFor(123_456_789_012_345_678n)).rejects.toThrow(
      "Quote changed. Please try again."
    )
  })

  it("accepts a deposit below the exact input at full precision", async () => {
    // the double just below 0.123456789012345678
    exchangeEchoing(() => 0.12345678901234566)

    await expect(confirmFor(123_456_789_012_345_678n)).resolves.toMatchObject({
      transaction: { transaction: { value: 123_456_789_012_345_660n } },
    })
  })
})
