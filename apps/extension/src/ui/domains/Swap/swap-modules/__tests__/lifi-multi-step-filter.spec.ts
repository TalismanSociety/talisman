import type { Route, RoutesResponse } from "@lifi/types"
import { describe, expect, it, vi } from "vitest"

// --- Mocks ---

// Mock the internal getRoutes by intercepting the @lifi/sdk.getRoutes call and
// also mocking the dependencies that getRoutes uses before calling the SDK.

const mockLifiGetRoutes = vi.fn()

vi.mock("@lifi/sdk", () => ({
  createClient: vi.fn(() => ({})),
  getRoutes: (_client: unknown, ...args: unknown[]) => mockLifiGetRoutes(...args),
  getStepTransaction: vi.fn(),
  getTokens: vi.fn().mockResolvedValue({
    tokens: {
      // Chain ID 1 (Ethereum) has one native token
      "1": [
        {
          address: "0x0000000000000000000000000000000000000000",
          chainId: 1,
          decimals: 18,
          symbol: "ETH",
          name: "Ether",
        },
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
  getExtensionPublicClient: vi.fn(),
}))

// Mock chaindata to return observable-like values
const { of } = await import("rxjs")

vi.mock("@ui/state/chaindata", () => ({
  getNetworkById$: vi.fn(() => of(null)),
  getNetworksMapById$: vi.fn(() =>
    of({
      "1": { id: "1", name: "Ethereum", platform: "ethereum", nativeTokenId: "1:evm-native" },
    })
  ),
  getToken$: vi.fn(() =>
    of({ id: "1:evm-native", type: "evm-native", decimals: 18, symbol: "ETH", networkId: "1" })
  ),
  getTokensMap$: vi.fn(() =>
    of({
      "1:evm-native": {
        id: "1:evm-native",
        type: "evm-native",
        decimals: 18,
        symbol: "ETH",
        networkId: "1",
      },
    })
  ),
}))

// Import the module under test after mocks
const { lifiSwapModule } = await import("../lifi-swap-module")

// --- Test helpers ---

/** Build a minimal LiFi step stub. */
const makeStep = (overrides?: Record<string, unknown>) => ({
  id: "step-1",
  type: "lifi" as const,
  tool: "1inch",
  toolDetails: { key: "1inch", name: "1inch", logoURI: "https://logo" },
  action: {
    fromChainId: 1,
    toChainId: 1,
    fromAmount: "1000000000000000000",
    fromToken: {
      address: "0x0000000000000000000000000000000000000000",
      chainId: 1,
      decimals: 18,
      symbol: "ETH",
    },
    toToken: {
      address: "0x0000000000000000000000000000000000000000",
      chainId: 1,
      decimals: 18,
      symbol: "ETH",
    },
  },
  estimate: {
    tool: "1inch",
    fromAmount: "1000000000000000000",
    toAmount: "950000000000000000",
    toAmountMin: "940000000000000000",
    approvalAddress: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    executionDuration: 30,
    feeCosts: [],
    gasCosts: [],
  },
  includedSteps: [],
  ...overrides,
})

/** Build a minimal LiFi route stub with a given number of steps. */
const makeRoute = (stepCount: number, id?: string): Route =>
  ({
    id: id ?? `route-${stepCount}-steps`,
    fromChainId: 1,
    toChainId: stepCount > 1 ? 137 : 1,
    fromAmount: "1000000000000000000",
    fromAmountUSD: "1.00",
    toAmount: "950000000000000000",
    toAmountMin: "940000000000000000",
    toAmountUSD: "0.95",
    fromToken: {
      address: "0x0000000000000000000000000000000000000000",
      chainId: 1,
      decimals: 18,
      symbol: "ETH",
    },
    toToken: {
      address: "0x0000000000000000000000000000000000000000",
      chainId: 1,
      decimals: 18,
      symbol: "ETH",
    },
    gasCostUSD: "0.10",
    containsSwitchChain: stepCount > 1,
    steps: Array.from({ length: stepCount }, (_, i) => makeStep({ id: `step-${i}` })),
    insurance: { state: "NOT_INSURABLE", feeAmountUsd: "0" },
    tags: [],
  }) as unknown as Route

/** Seed the internal asset cache by triggering getFromAssets. */
const seedAssetCache = async () => {
  // Force getLifiAssets to populate assetsByTokenId with our mocked token map
  const signal = new AbortController().signal
  await lifiSwapModule.getFromAssets(signal)
}

// --- Tests ---

describe("lifi-swap-module multi-step route filtering", () => {
  it("filters out routes with more than one step", async () => {
    await seedAssetCache()

    const singleStepRoute = makeRoute(1, "single")
    const twoStepRoute = makeRoute(2, "two-step")
    const threeStepRoute = makeRoute(3, "three-step")

    mockLifiGetRoutes.mockResolvedValue({
      routes: [singleStepRoute, twoStepRoute, threeStepRoute],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } satisfies RoutesResponse)

    const controller = new AbortController()
    const result = await lifiSwapModule.getQuote(
      {
        fromTokenId: "1:evm-native",
        toTokenId: "1:evm-native",
        fromAmount: 1000000000000000000n,
        fromAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
        toAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
      },
      controller.signal
    )

    // Should return exactly 1 quote (from the single-step route)
    const quotes = Array.isArray(result) ? result : result ? [result] : []
    expect(quotes).toHaveLength(1)
    expect(quotes[0]?.data).toBe(singleStepRoute)
  })

  it("returns null when all routes are multi-step", async () => {
    await seedAssetCache()

    mockLifiGetRoutes.mockResolvedValue({
      routes: [makeRoute(2), makeRoute(3), makeRoute(4)],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } satisfies RoutesResponse)

    const controller = new AbortController()
    const result = await lifiSwapModule.getQuote(
      {
        fromTokenId: "1:evm-native",
        toTokenId: "1:evm-native",
        fromAmount: 1000000000000000000n,
        fromAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
        toAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
      },
      controller.signal
    )

    expect(result).toBeNull()
  })

  it("returns all quotes when all routes are single-step", async () => {
    await seedAssetCache()

    const routeA = makeRoute(1, "route-a")
    const routeB = makeRoute(1, "route-b")

    mockLifiGetRoutes.mockResolvedValue({
      routes: [routeA, routeB],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } satisfies RoutesResponse)

    const controller = new AbortController()
    const result = await lifiSwapModule.getQuote(
      {
        fromTokenId: "1:evm-native",
        toTokenId: "1:evm-native",
        fromAmount: 1000000000000000000n,
        fromAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
        toAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
      },
      controller.signal
    )

    const quotes = Array.isArray(result) ? result : result ? [result] : []
    expect(quotes).toHaveLength(2)
  })

  it("handles empty routes array", async () => {
    await seedAssetCache()

    mockLifiGetRoutes.mockResolvedValue({
      routes: [],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } satisfies RoutesResponse)

    const controller = new AbortController()
    const result = await lifiSwapModule.getQuote(
      {
        fromTokenId: "1:evm-native",
        toTokenId: "1:evm-native",
        fromAmount: 1000000000000000000n,
        fromAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
        toAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
      },
      controller.signal
    )

    expect(result).toBeNull()
  })
})
