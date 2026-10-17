import BigNumber from "bignumber.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))

vi.mock("@core/domains/app/store.remoteConfig", () => ({
  remoteConfigStore: {
    get: vi.fn(async () => ({
      simpleswapApiKey: "api-key",
      simpleswapDiscountedCurrencies: [],
      simpleswap: {
        networks: { eth: "1" },
        tokens: { eth: "1:evm-native", dot: "polkadot:substrate-native" },
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

vi.stubGlobal("fetch", mockFetch)

const { simpleswapSwapModule } = await import("../simpleswap-swap-module")
const { confirmSwap } = await import("./confirmSwap")

const FROM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const TO_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const DEPOSIT_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const ONE_ETH = 10n ** 18n

const currency = (symbol: string, network: string) => ({
  name: symbol,
  symbol,
  network,
  precision: null,
  contract_address: null,
  extra_id: "",
  has_extra_id: false,
  address_explorer: "",
  confirmations_from: "",
  image: "",
  isFiat: false,
})

const EXCHANGE = {
  id: "exchange-1",
  currency_from: "eth",
  currency_to: "dot",
  expected_amount: "0.99",
  address_from: DEPOSIT_ADDRESS,
  address_to: TO_ADDRESS,
}

const respond = (url: string) => {
  const { pathname } = new URL(url)
  switch (pathname) {
    case "/get_all_currencies":
      return [currency("eth", "eth"), currency("dot", "dot")]
    case "/get_ranges":
      return { min: "0.01" }
    case "/get_estimated":
      return "250.5"
    case "/create_exchange":
      return EXCHANGE
    default:
      throw new Error(`unexpected request ${pathname}`)
  }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation(async (url: string) => ({ json: async () => respond(url) }))
})

describe("simpleswapSwapModule confirm screen", () => {
  it("creates one exchange and deposits its expected amount", async () => {
    const signal = new AbortController().signal
    await simpleswapSwapModule.getFromAssets(signal)
    const quote = await simpleswapSwapModule.getQuote(
      {
        fromTokenId: ETH.id,
        toTokenId: DOT.id,
        fromAmount: ONE_ETH,
        fromAddress: FROM_ADDRESS,
        toAddress: TO_ADDRESS,
        input: "exact",
      },
      signal
    )
    if (!quote || Array.isArray(quote)) throw new Error("expected a single quote")
    mockFetch.mockClear()

    expect(
      await confirmSwap({
        module: simpleswapSwapModule,
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
          value: 990_000_000_000_000_000n,
          account: FROM_ADDRESS,
        },
      },
      fees: [
        { name: "Est. Gas Fees", tokenId: ETH.id, amount: BigNumber("0.00021") },
        { name: "Talisman Fee", tokenId: ETH.id, amount: BigNumber("0.015") },
      ],
      txInfo: {
        type: "swap-simpleswap",
        exchangeId: "exchange-1",
        fromTokenId: ETH.id,
        toTokenId: DOT.id,
        fromAmount: "1000000000000000000",
        toAmount: "2505000000000",
        to: TO_ADDRESS,
      },
    })
    expect(
      mockFetch.mock.calls.filter(([url]) => new URL(url).pathname === "/create_exchange")
    ).toHaveLength(1)
  })
})
