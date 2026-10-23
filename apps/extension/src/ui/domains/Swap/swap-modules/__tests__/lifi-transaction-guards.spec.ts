import { log } from "@common/log"
import type { Route } from "@lifi/types"
import BigNumber from "bignumber.js"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

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

const logError = vi.spyOn(log, "error").mockImplementation(() => {})

const lifiSdk = await import("@lifi/sdk")
const { lifiSwapModule } = await import("../lifi-swap-module")
const { quoteFromLegs } = await import("../common.swap-module")
const { confirmSwap } = await import("./confirmSwap")

// --- Test helpers ---

const FROM_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const ROUTER_ADDRESS = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
const APPROVAL_ADDRESS = "0x1111111254EEB25477B68fb85Ed929f73A960582"

const NATIVE_TOKEN_ID = NATIVE_TOKEN.id
const ERC20_TOKEN_ID = ERC20_TOKEN.id

const ONE_ETH = 1_000_000_000_000_000_000n
const ONE_USDC = 1_000_000n

type FeeCost = {
  name: string
  amount: string
  included: boolean
  token: { address: string; chainId: number; decimals: number }
}

const nativeFee = (amount: bigint, included: boolean, chainId = 1): FeeCost => ({
  name: "Bridge Fee",
  amount: amount.toString(),
  included,
  token: { address: "0x0000000000000000000000000000000000000000", chainId, decimals: 18 },
})

const makeRoute = (fromAmount: bigint, feeCosts: FeeCost[] = []): Route =>
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
          feeCosts,
          gasCosts: [],
        },
        includedSteps: [],
      },
    ],
  }) as unknown as Route

const makeQuote = (fromAmount: bigint, feeCosts: FeeCost[] = [], fromTokenId = NATIVE_TOKEN_ID) =>
  quoteFromLegs(
    [
      {
        protocol: "lifi",
        fromTokenId,
        toTokenId: NATIVE_TOKEN_ID,
        signer: FROM_ADDRESS,
        recipient: FROM_ADDRESS,
        inputAmount: fromAmount,
        outputAmount: 950_000_000_000_000_000n,
        fees: [],
        timeInSec: 30,
        data: makeRoute(fromAmount, feeCosts),
      },
    ],
    { protocol: "lifi", decentralisationScore: 2, providerLogo: "", providerName: "LI.FI" }
  )

const givenRoutes = (routes: Route[]) =>
  vi.mocked(lifiSdk.getRoutes).mockResolvedValue({
    routes,
    unavailableRoutes: { failed: [], filteredOut: [] },
  } as unknown as Awaited<ReturnType<typeof lifiSdk.getRoutes>>)

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

const buildLeg = (
  fromTokenId = NATIVE_TOKEN_ID,
  fromAmount = ONE_ETH,
  feeCosts: FeeCost[] = []
) => {
  givenRoutes([makeRoute(fromAmount, feeCosts)])
  return lifiSwapModule.buildLeg({
    leg: makeQuote(fromAmount, feeCosts, fromTokenId).legs[0],
    input: fromAmount,
    context: { platform: "ethereum" },
    exchange: null,
    slippage: 0.005,
  })
}

/** The module logs the provider error before it rethrows it. */
const expectRejection = async (transaction: Promise<unknown>, message: string) => {
  await expect(transaction).rejects.toThrow(message)
  expect(logError).toHaveBeenCalledWith(
    expect.objectContaining({
      message: "Failed to create evm transaction",
      cause: expect.objectContaining({ message: expect.stringContaining(message) }),
    })
  )
}

const getQuote = (feeCosts: FeeCost[]) => {
  givenRoutes([makeRoute(ONE_ETH, feeCosts)])
  return lifiSwapModule.getQuote(
    {
      fromTokenId: NATIVE_TOKEN_ID,
      toTokenId: NATIVE_TOKEN_ID,
      fromAmount: ONE_ETH,
      fromAddress: FROM_ADDRESS,
      toAddress: FROM_ADDRESS,
      input: "exact",
    },
    new AbortController().signal
  )
}

const single = <T>(quote: T | T[] | null) => (Array.isArray(quote) ? quote[0] : quote)

/** The module resolves assets from a cache populated by `getFromAssets`. */
const seedAssetCache = () => lifiSwapModule.getFromAssets(new AbortController().signal)

// --- Tests ---

describe("lifi buildLeg — provider transaction guards", () => {
  beforeEach(() => logError.mockClear())
  afterAll(() => logError.mockRestore())

  it("builds the transaction when the provider response matches the swap", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: `0x${ONE_ETH.toString(16)}` })

    const { transaction } = await buildLeg()

    expect(transaction.platform).toBe("ethereum")
    expect(transaction.platform === "ethereum" && transaction.transaction.to).toBe(ROUTER_ADDRESS)
  })

  it("accepts an erc20 swap carrying no native value", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: "0x0" })

    const result = await buildLeg(ERC20_TOKEN_ID, ONE_USDC)

    expect(result.transaction.platform).toBe("ethereum")
  })

  it("rejects a native value above the amount the user entered", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: `0x${(ONE_ETH + 1n).toString(16)}` })

    await expectRejection(buildLeg(), "Unexpected transaction amount")
  })

  it("rejects a native value carried by an erc20 swap", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: `0x${ONE_ETH.toString(16)}` })

    await expectRejection(buildLeg(ERC20_TOKEN_ID, ONE_USDC), "Unexpected transaction amount")
  })

  describe("fees charged on top of the input", () => {
    const BRIDGE_FEE = 5_000_000_000_000_000n

    it("lets a native swap carry the bridge fee on top of the entered amount", async () => {
      await seedAssetCache()
      givenProviderTransaction({ value: `0x${(ONE_ETH + BRIDGE_FEE).toString(16)}` })

      const result = await buildLeg(NATIVE_TOKEN_ID, ONE_ETH, [nativeFee(BRIDGE_FEE, false)])

      expect(result.transaction.platform).toBe("ethereum")
    })

    it("rejects a native value above the entered amount plus the bridge fee", async () => {
      await seedAssetCache()
      givenProviderTransaction({ value: `0x${(ONE_ETH + BRIDGE_FEE + 1n).toString(16)}` })

      await expectRejection(
        buildLeg(NATIVE_TOKEN_ID, ONE_ETH, [nativeFee(BRIDGE_FEE, false)]),
        "Unexpected transaction amount"
      )
    })

    it("requires an erc20 swap to carry exactly the bridge fee", async () => {
      await seedAssetCache()
      givenProviderTransaction({ value: `0x${BRIDGE_FEE.toString(16)}` })

      const result = await buildLeg(ERC20_TOKEN_ID, ONE_USDC, [nativeFee(BRIDGE_FEE, false)])

      expect(result.transaction.platform).toBe("ethereum")
    })

    it("ignores an included fee", async () => {
      await seedAssetCache()
      givenProviderTransaction({ value: `0x${(ONE_ETH + BRIDGE_FEE).toString(16)}` })

      await expectRejection(
        buildLeg(NATIVE_TOKEN_ID, ONE_ETH, [nativeFee(BRIDGE_FEE, true)]),
        "Unexpected transaction amount"
      )
    })

    it("ignores a fee charged on another network", async () => {
      await seedAssetCache()
      givenProviderTransaction({ value: `0x${(ONE_ETH + BRIDGE_FEE).toString(16)}` })

      await expectRejection(
        buildLeg(NATIVE_TOKEN_ID, ONE_ETH, [nativeFee(BRIDGE_FEE, false, 137)]),
        "Unexpected transaction amount"
      )
    })
  })

  it("rejects calldata aimed at the token being swapped", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: "0x0", to: ERC20_ADDRESS })

    await expectRejection(buildLeg(ERC20_TOKEN_ID, ONE_USDC), "Unexpected transaction target")
  })

  it("rejects a transaction for a different chain", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: "0x0", chainId: 137 })

    await expectRejection(buildLeg(), "Unexpected chain")
  })

  it("rejects a transaction for a different sender", async () => {
    await seedAssetCache()
    givenProviderTransaction({ value: "0x0", from: "0x0000000000000000000000000000000000000bad" })

    await expectRejection(buildLeg(), "Invalid sender address")
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

describe("lifi getQuote — additional fees", () => {
  it("flags the fees charged on top of the input", async () => {
    await seedAssetCache()

    const quotes = await getQuote([
      nativeFee(1_000n, false),
      { ...nativeFee(2_000n, true), name: "Protocol Fee" },
    ])

    const quote = Array.isArray(quotes) ? quotes[0] : quotes
    expect(quote?.fees.map((fee) => [fee.name, fee.additional])).toEqual([
      ["Bridge Fee", true],
      ["Protocol Fee", false],
      ["Talisman Fee", undefined],
    ])
  })
})

describe("lifi confirm screen", () => {
  it("builds the step of a fresh route at the user's slippage", async () => {
    await seedAssetCache()
    const quote = single(await getQuote([nativeFee(1_000n, false)]))
    if (!quote) throw new Error("expected a quote")
    givenRoutes([makeRoute(ONE_ETH, [nativeFee(2_000n, false)])])
    givenProviderTransaction({ value: `0x${(ONE_ETH + 2_000n).toString(16)}` })

    expect(
      await confirmSwap({
        module: lifiSwapModule,
        quote,
        fromTokenId: NATIVE_TOKEN_ID,
        toTokenId: NATIVE_TOKEN_ID,
        fromAddress: FROM_ADDRESS,
        toAddress: FROM_ADDRESS,
        fromAmount: ONE_ETH,
        context: { platform: "ethereum" },
        slippage: 0.005,
      })
    ).toEqual({
      transaction: {
        platform: "ethereum",
        transaction: {
          chain: null,
          to: ROUTER_ADDRESS,
          value: ONE_ETH + 2_000n,
          data: "0x1234",
          gasLimit: "0x5208",
          account: FROM_ADDRESS,
        },
      },
      fees: [
        {
          name: "Bridge Fee",
          tokenId: NATIVE_TOKEN_ID,
          amount: BigNumber("0.000000000000002"),
          additional: true,
        },
        { name: "Talisman Fee", tokenId: NATIVE_TOKEN_ID, amount: BigNumber("0.0045") },
      ],
      txInfo: {
        type: "swap-lifi",
        protocolName: "1inch",
        fromTokenId: NATIVE_TOKEN_ID,
        toTokenId: NATIVE_TOKEN_ID,
        fromAmount: "1000000000000000000",
        toAmount: "940000000000000000",
        to: FROM_ADDRESS,
      },
    })
    expect(vi.mocked(lifiSdk.getRoutes).mock.lastCall?.[1].options?.slippage).toBe(0.005)
    expect(mockGetStepTransaction.mock.lastCall?.[0].estimate.feeCosts).toEqual([
      nativeFee(2_000n, false),
    ])
  })
})
