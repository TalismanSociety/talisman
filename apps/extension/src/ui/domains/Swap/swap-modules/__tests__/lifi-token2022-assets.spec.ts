import type { Route, RoutesResponse } from "@lifi/types"
import { solToken2022TokenId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

const SOLANA_CHAIN_ID = 1_151_111_081_099_710
const TOKEN_2022_MINT = "TokenzQdBNbLqP5VEhdkAS6EPFMLqKzpWVF9Ss623VQ5DA"
const TOKEN_2022_ID = solToken2022TokenId("solana-mainnet", TOKEN_2022_MINT)

const mockLifiGetRoutes = vi.fn()

vi.mock("@lifi/sdk", () => ({
  createConfig: vi.fn(),
  getRoutes: (...args: unknown[]) => mockLifiGetRoutes(...args),
  getStepTransaction: vi.fn(),
  getTokens: vi.fn().mockResolvedValue({
    tokens: {
      [SOLANA_CHAIN_ID]: [],
    },
  }),
  getToken: vi.fn().mockResolvedValue({
    address: TOKEN_2022_MINT,
    chainId: SOLANA_CHAIN_ID,
    decimals: 6,
    symbol: "T22",
    name: "Token 2022",
  }),
  ChainType: { EVM: "EVM", SVM: "SVM" },
}))

vi.mock("@core/domains/app/store.remoteConfig", () => ({
  remoteConfigStore: {
    get: vi.fn().mockResolvedValue({
      lifi: { solanaChainId: SOLANA_CHAIN_ID },
      lifiTalismanTokens: [TOKEN_2022_ID],
      lifiCustomFeeTokens: {},
    }),
  },
}))

vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({
  getExtensionPublicClient: vi.fn(),
}))

vi.mock("../../hooks/useSwapSlippage", () => ({
  getSwapSlippageDecimal: vi.fn().mockResolvedValue(0.005),
}))

const { of } = await import("rxjs")

vi.mock("@ui/state/chaindata", () => ({
  getNetworkById$: vi.fn(() => of(null)),
  getNetworksMapById$: vi.fn(({ platform }: { platform: string }) =>
    of(
      platform === "ethereum"
        ? {}
        : {
            "solana-mainnet": {
              id: "solana-mainnet",
              name: "Solana",
              platform: "solana",
              nativeTokenId: "solana-mainnet:sol-native",
            },
          }
    )
  ),
  getToken$: vi.fn(() => of(null)),
  getTokensMap$: vi.fn(({ platform }: { platform: string }) =>
    of(
      platform === "solana"
        ? {
            [TOKEN_2022_ID]: {
              id: TOKEN_2022_ID,
              type: "sol-token2022",
              platform: "solana",
              networkId: "solana-mainnet",
              mintAddress: TOKEN_2022_MINT,
              decimals: 6,
              symbol: "T22",
            },
          }
        : {}
    )
  ),
}))

const { lifiSwapModule } = await import("../lifi-swap-module")

const makeRoute = (): Route =>
  ({
    id: "token-2022-route",
    fromChainId: SOLANA_CHAIN_ID,
    toChainId: SOLANA_CHAIN_ID,
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
        tool: "jupiter",
        toolDetails: { key: "jupiter", name: "Jupiter", logoURI: "https://logo" },
        action: {
          fromChainId: SOLANA_CHAIN_ID,
          toChainId: SOLANA_CHAIN_ID,
          fromAmount: "1000",
          fromToken: {
            address: TOKEN_2022_MINT,
            chainId: SOLANA_CHAIN_ID,
            decimals: 6,
            symbol: "T22",
          },
          toToken: {
            address: TOKEN_2022_MINT,
            chainId: SOLANA_CHAIN_ID,
            decimals: 6,
            symbol: "T22",
          },
        },
        estimate: {
          tool: "jupiter",
          fromAmount: "1000",
          toAmount: "900",
          toAmountMin: "890",
          executionDuration: 10,
          feeCosts: [
            {
              amount: "5",
              name: "Provider Fee",
              token: {
                address: TOKEN_2022_MINT,
                chainId: SOLANA_CHAIN_ID,
                decimals: 6,
                symbol: "T22",
              },
            },
          ],
          gasCosts: [],
        },
        includedSteps: [],
      },
    ],
    insurance: { state: "NOT_INSURABLE", feeAmountUsd: "0" },
    tags: [],
  }) as unknown as Route

describe("lifi-swap-module Token-2022 assets", () => {
  it("keeps remote-configured Token-2022 assets and resolves Token-2022 fee tokens", async () => {
    const signal = new AbortController().signal
    const fromAssets = await lifiSwapModule.getFromAssets(signal)

    expect(fromAssets).toContain(TOKEN_2022_ID)

    mockLifiGetRoutes.mockResolvedValue({
      routes: [makeRoute()],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } satisfies RoutesResponse)

    const result = await lifiSwapModule.getQuote(
      {
        fromTokenId: TOKEN_2022_ID,
        toTokenId: TOKEN_2022_ID,
        fromAmount: 1000n,
        fromAddress: "11111111111111111111111111111111",
        toAddress: "11111111111111111111111111111111",
      },
      signal
    )

    const quote = Array.isArray(result) ? result[0] : result

    expect(quote?.fees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Provider Fee", tokenId: TOKEN_2022_ID }),
      ])
    )
  })
})
