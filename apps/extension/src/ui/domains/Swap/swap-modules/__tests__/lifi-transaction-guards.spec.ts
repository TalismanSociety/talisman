import type { Route } from "@lifi/types"
import { describe, expect, it, vi } from "vitest"

// --- Mocks ---

const { ERC20_ADDRESS, mockGetStepTransaction } = vi.hoisted(() => ({
  ERC20_ADDRESS: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  mockGetStepTransaction: vi.fn(),
}))

vi.mock("@lifi/sdk", () => ({
  createClient: vi.fn(() => ({})),
  getRoutes: vi.fn(),
  getStepTransaction: (_client: unknown, ...args: unknown[]) => mockGetStepTransaction(...args),
  getTokens: vi.fn().mockResolvedValue({
    tokens: {
      "1": [
        {
          address: "0x0000000000000000000000000000000000000000",
          chainId: 1,
          decimals: 18,
          symbol: "ETH",
          name: "Ether",
        },
        { address: ERC20_ADDRESS, chainId: 1, decimals: 6, symbol: "USDC", name: "USD Coin" },
      ],
    },
  }),
  getToken: vi.fn(),
  ChainType: { EVM: "EVM", SVM: "SVM" },
}))

vi.mock("@core/domains/app/store.remoteConfig", () => ({
  remoteConfigStore: {
    get: vi.fn().mockResolvedValue({
      lifi: { solanaChainId: 1151111081099710 },
      lifiTalismanTokens: [],
      lifiCustomFeeTokens: {},
    }),
  },
}))

vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({
  getExtensionPublicClient: vi.fn(() => ({})),
}))

// the gas check talks to a node — return the request unchanged so we can observe what was built
vi.mock("../evm-gas-check", () => ({
  prepareTransactionRequestWithGasCheck: vi.fn(
    async (_client: unknown, _feeTokenId: string, request: unknown) => request
  ),
}))

const { of } = await import("rxjs")

const EVM_NETWORK = {
  id: "1",
  name: "Ethereum",
  platform: "ethereum",
  nativeTokenId: "1:evm-native",
}
const NATIVE_TOKEN = {
  id: "1:evm-native",
  type: "evm-native",
  decimals: 18,
  symbol: "ETH",
  networkId: "1",
}
const ERC20_TOKEN = {
  id: `1:evm-erc20:${ERC20_ADDRESS.toLowerCase()}`,
  type: "evm-erc20",
  decimals: 6,
  symbol: "USDC",
  networkId: "1",
  contractAddress: ERC20_ADDRESS,
}

vi.mock("@ui/state/chaindata", () => ({
  getNetworkById$: vi.fn(() => of(EVM_NETWORK)),
  getNetworksMapById$: vi.fn(() => of({ "1": EVM_NETWORK })),
  getToken$: vi.fn(() => of(NATIVE_TOKEN)),
  getTokensMap$: vi.fn(() =>
    of({ [NATIVE_TOKEN.id]: NATIVE_TOKEN, [ERC20_TOKEN.id]: ERC20_TOKEN })
  ),
}))

const { lifiSwapModule } = await import("../lifi-swap-module")

// --- Test helpers ---

const FROM_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const ROUTER_ADDRESS = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
const APPROVAL_ADDRESS = "0x1111111254EEB25477B68fb85Ed929f73A960582"

const NATIVE_TOKEN_ID = NATIVE_TOKEN.id
const ERC20_TOKEN_ID = ERC20_TOKEN.id

const ONE_ETH = 1_000_000_000_000_000_000n
const ONE_USDC = 1_000_000n

const makeRoute = (fromAmount: bigint): Route =>
  ({
    id: "route-1",
    fromChainId: 1,
    toChainId: 1,
    fromAmount: fromAmount.toString(),
    toAmount: "950000000000000000",
    toAmountMin: "940000000000000000",
    steps: [
      {
        id: "step-1",
        type: "lifi" as const,
        tool: "1inch",
        toolDetails: { key: "1inch", name: "1inch", logoURI: "https://logo" },
        action: {
          fromChainId: 1,
          toChainId: 1,
          fromAmount: fromAmount.toString(),
          fromToken: { address: "0x0", chainId: 1, decimals: 18, symbol: "ETH" },
          toToken: { address: "0x0", chainId: 1, decimals: 18, symbol: "ETH" },
        },
        estimate: {
          tool: "1inch",
          fromAmount: fromAmount.toString(),
          toAmount: "950000000000000000",
          toAmountMin: "940000000000000000",
          approvalAddress: APPROVAL_ADDRESS,
          executionDuration: 30,
          feeCosts: [],
          gasCosts: [],
        },
        includedSteps: [],
      },
    ],
  }) as unknown as Route

const makeQuote = (fromAmount: bigint) => ({
  protocol: "lifi" as const,
  decentralisationScore: 2,
  outputAmountBN: 950_000_000_000_000_000n,
  inputAmountBN: fromAmount,
  fees: [],
  timeInSec: 30,
  providerLogo: "",
  providerName: "LI.FI",
  data: makeRoute(fromAmount),
})

/** Set what the provider returns from `getStepTransaction`. */
const givenProviderTransaction = (txRequest: Record<string, unknown>) =>
  mockGetStepTransaction.mockResolvedValue({
    transactionRequest: {
      from: FROM_ADDRESS,
      to: ROUTER_ADDRESS,
      data: "0x1234",
      chainId: 1,
      value: "0x0",
      gasLimit: "0x5208",
      ...txRequest,
    },
  })

const getTransaction = (fromTokenId = NATIVE_TOKEN_ID, fromAmount = ONE_ETH) =>
  lifiSwapModule.getTransaction({
    fromTokenId,
    fromAddress: FROM_ADDRESS,
    fromAmount,
    exchange: makeQuote(fromAmount),
    context: { platform: "ethereum" },
  })

/** The module resolves assets from a cache populated by `getFromAssets`. */
const seedAssetCache = () => lifiSwapModule.getFromAssets(new AbortController().signal)

// --- Tests ---

describe("lifi getTransaction — provider transaction guards", () => {
  it("builds the transaction when the provider response matches the swap", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: `0x${ONE_ETH.toString(16)}` })

    const result = await getTransaction()

    expect(result?.platform).toBe("ethereum")
    expect(result?.platform === "ethereum" && result.transaction.to).toBe(ROUTER_ADDRESS)
  })

  it("accepts an erc20 swap carrying no native value", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: "0x0" })

    const result = await getTransaction(ERC20_TOKEN_ID, ONE_USDC)

    expect(result?.platform).toBe("ethereum")
  })

  it("rejects a native value above the amount the user entered", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: `0x${(ONE_ETH + 1n).toString(16)}` })

    await expect(getTransaction()).rejects.toThrow("Unexpected transaction amount")
  })

  it("rejects a native value carried by an erc20 swap", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: `0x${ONE_ETH.toString(16)}` })

    await expect(getTransaction(ERC20_TOKEN_ID, ONE_USDC)).rejects.toThrow(
      "Unexpected transaction amount"
    )
  })

  it("rejects calldata aimed at the token being swapped", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: "0x0", to: ERC20_ADDRESS })

    await expect(getTransaction(ERC20_TOKEN_ID, ONE_USDC)).rejects.toThrow(
      "Unexpected transaction target"
    )
  })

  it("rejects a transaction for a different chain", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: "0x0", chainId: 137 })

    await expect(getTransaction()).rejects.toThrow("Unexpected chain")
  })

  it("rejects a transaction for a different sender", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: "0x0", from: "0x0000000000000000000000000000000000000bad" })

    await expect(getTransaction()).rejects.toThrow("Invalid sender address")
  })
})

describe("lifi getApprovalInfo — allowance bound", () => {
  it("approves the amount the user entered, not the amount the route echoes back", async () => {
    await seedAssetCache()

    const approval = lifiSwapModule.getApprovalInfo?.({
      fromTokenId: ERC20_TOKEN_ID,
      toTokenId: NATIVE_TOKEN_ID,
      fromAmount: ONE_USDC,
      fromAddress: FROM_ADDRESS,
      toAddress: FROM_ADDRESS,
      // the provider inflates the route amount to the victim's whole balance
      quoteData: makeQuote(999_999_999_999n),
    })

    expect(approval?.amount).toBe(ONE_USDC)
  })
})
