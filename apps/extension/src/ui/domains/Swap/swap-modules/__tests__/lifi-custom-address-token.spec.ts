import type { Route, RoutesResponse } from "@lifi/types"
import { type EvmErc20Token, evmErc20TokenId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

const CUSTOM_ADDRESS = "0x96f6ef951840721adbf46ac996b59e0235cb985c"
const CUSTOM_ID = evmErc20TokenId("1", CUSTOM_ADDRESS)
const NATIVE_ID = "1:evm-native"

const customToken = {
  id: CUSTOM_ID,
  type: "evm-erc20",
  platform: "ethereum",
  networkId: "1",
  contractAddress: CUSTOM_ADDRESS,
  decimals: 18,
  symbol: "USDY",
  name: "Ondo U.S. Dollar Yield",
  __isCustom: false,
} as EvmErc20Token & { __isCustom: boolean }

const nativeToken = {
  id: NATIVE_ID,
  type: "evm-native",
  platform: "ethereum",
  networkId: "1",
  decimals: 18,
  symbol: "ETH",
}

const ethereumNetwork = {
  id: "1",
  name: "Ethereum",
  platform: "ethereum",
  nativeTokenId: NATIVE_ID,
}

const mockLifiGetRoutes = vi.fn()

vi.mock("@lifi/sdk", () => ({
  createClient: vi.fn(() => ({})),
  getRoutes: (_client: unknown, ...args: unknown[]) => mockLifiGetRoutes(...args),
  getStepTransaction: vi.fn(),
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

vi.mock("../../hooks/useSwapSlippage", () => ({
  getSwapSlippageDecimal: vi.fn().mockResolvedValue(0.005),
}))

const { of } = await import("rxjs")

vi.mock("@ui/state/chaindata", () => ({
  getNetworkById$: vi.fn(() => of(ethereumNetwork)),
  getNetworksMapById$: vi.fn(({ platform }: { platform: string }) =>
    of(platform === "ethereum" ? { "1": ethereumNetwork } : {})
  ),
  getToken$: vi.fn((id: string) => of(id === CUSTOM_ID ? customToken : nativeToken)),
  getTokensMap$: vi.fn(({ platform }: { platform: string }) =>
    of(platform === "ethereum" ? { [NATIVE_ID]: nativeToken, [CUSTOM_ID]: customToken } : {})
  ),
}))

const { lifiSwapModule } = await import("../lifi-swap-module")

const makeRoute = (): Route =>
  ({
    id: "manual-token-route",
    fromChainId: 1,
    toChainId: 1,
    fromAmount: "1000",
    fromAmountUSD: "1.00",
    toAmount: "900",
    toAmountMin: "890",
    toAmountUSD: "0.89",
    gasCostUSD: "0.01",
    containsSwitchChain: false,
    steps: [
      {
        id: "step-1",
        type: "lifi",
        tool: "kyberswap",
        toolDetails: { key: "kyberswap", name: "Kyberswap", logoURI: "https://logo" },
        action: {
          fromChainId: 1,
          toChainId: 1,
          fromAmount: "1000",
          fromToken: {
            address: CUSTOM_ADDRESS,
            chainId: 1,
            decimals: 18,
            symbol: "USDY",
          },
          toToken: {
            address: "0x0000000000000000000000000000000000000000",
            chainId: 1,
            decimals: 18,
            symbol: "ETH",
          },
        },
        estimate: {
          tool: "kyberswap",
          fromAmount: "1000",
          toAmount: "900",
          toAmountMin: "890",
          executionDuration: 10,
          feeCosts: [],
          gasCosts: [],
        },
        includedSteps: [],
      },
    ],
    insurance: { state: "NOT_INSURABLE", feeAmountUsd: "0" },
    tags: [],
  }) as unknown as Route

describe("lifi custom address tokens", () => {
  it("resolves an unlisted ERC-20 on-the-fly and routes by address", async () => {
    const signal = new AbortController().signal

    // The custom token is an ERC-20 on an EVM chain known to LI.FI,
    // so getLifiAssetIds includes it even though it's not in LI.FI's default list.
    await expect(lifiSwapModule.getFromAssets(signal)).resolves.toContain(CUSTOM_ID)

    mockLifiGetRoutes.mockResolvedValue({
      routes: [makeRoute()],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } satisfies RoutesResponse)

    const result = await lifiSwapModule.getQuote(
      {
        fromTokenId: CUSTOM_ID,
        toTokenId: NATIVE_ID,
        fromAmount: 1000n,
        fromAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
        toAddress: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
      },
      signal
    )

    expect(result).not.toBeNull()
    expect(mockLifiGetRoutes).toHaveBeenCalledWith(
      expect.objectContaining({
        fromTokenAddress: CUSTOM_ADDRESS,
        toTokenAddress: "0x0000000000000000000000000000000000000000",
      }),
      { signal }
    )
  })
})
