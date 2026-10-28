import { TALISMAN_FEE_NAME } from "@core/domains/swaps/helpers"
import type { BaseQuote, QuoteLeg, QuoteParams } from "@core/domains/swaps/types"
import type { LiFiStep, Route, RoutesResponse, Token } from "@lifi/types"
import { of } from "rxjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

const ALICE = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"
const BOB = "0x1111111111111111111111111111111111111111"
const PLACEHOLDER = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const DIAMOND = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
const ZERO = "0x0000000000000000000000000000000000000000"

const token = (address: string, chainId: number, symbol: string, decimals: number): Token => ({
  address,
  chainId,
  symbol,
  decimals,
  name: symbol,
  priceUSD: "0",
})

const USDT = token("0xdAC17F958D2ee523a2206206994597C13D831ec7", 1, "USDT", 6)
const SKYAI = token("0x92aa03137385F18539301349dcfC9EbC923fFb10", 56, "SKYAI", 18)
const TRUMP = token("0x4eA98c1999575aaadfb38237Dd015c5E773F75a2", 56, "TRUMP", 9)
const BASE_ETH = token(ZERO, 8453, "ETH", 18)
const ARB = token("0x912CE59144191C1204E64559FE8253a0e49E6548", 42161, "ARB", 18)
const ETH = token(ZERO, 1, "ETH", 18)
const BNB = token(ZERO, 56, "BNB", 18)

const USDT_ID = `1:evm-erc20:${USDT.address.toLowerCase()}`
const SKYAI_ID = `56:evm-erc20:${SKYAI.address.toLowerCase()}`
const TRUMP_ID = `56:evm-erc20:${TRUMP.address.toLowerCase()}`
const BASE_ETH_ID = "8453:evm-native"
const ARB_ID = `42161:evm-erc20:${ARB.address.toLowerCase()}`

type StepSpec = {
  tool: string
  name: string
  from: Token
  to: Token
  fromAmount: string
  toAmount: string
  toAmountMin: string
  fromAddress: string
  toAddress: string
  gas: { amount: string; token: Token }
  feeCosts?: { name: string; amount: string; included: boolean; token: Token }[]
  executionDuration: number
}

const step = (id: string, spec: StepSpec): LiFiStep =>
  ({
    id,
    type: "lifi",
    tool: spec.tool,
    toolDetails: { key: spec.tool, name: spec.name, logoURI: `https://icons/${spec.tool}.svg` },
    action: {
      fromToken: spec.from,
      fromAmount: spec.fromAmount,
      toToken: spec.to,
      fromChainId: spec.from.chainId,
      toChainId: spec.to.chainId,
      slippage: 0.005,
      fromAddress: spec.fromAddress,
      toAddress: spec.toAddress,
    },
    estimate: {
      tool: spec.tool,
      approvalAddress: DIAMOND,
      toAmountMin: spec.toAmountMin,
      toAmount: spec.toAmount,
      fromAmount: spec.fromAmount,
      feeCosts: spec.feeCosts ?? [],
      gasCosts: [spec.gas],
      executionDuration: spec.executionDuration,
    },
    includedSteps: [],
  }) as unknown as LiFiStep

const route = (id: string, steps: LiFiStep[], fromAddress: string, toAddress: string): Route => {
  const first = steps[0]
  const last = steps[steps.length - 1]
  return {
    id,
    fromChainId: first.action.fromChainId,
    toChainId: last.action.toChainId,
    fromAmount: first.action.fromAmount,
    fromAmountUSD: "0",
    toAmount: last.estimate.toAmount,
    toAmountMin: last.estimate.toAmountMin,
    toAmountUSD: "0",
    fromToken: first.action.fromToken,
    toToken: last.action.toToken,
    fromAddress,
    toAddress,
    containsSwitchChain: steps.length > 1,
    steps,
    insurance: { state: "NOT_INSURABLE", feeAmountUsd: "0" },
    tags: [],
  } as unknown as Route
}

/** USDT on Ethereum bridged to SKYAI on BNB Chain, then swapped to TRUMP (li.quest, 2026-10-28) */
const usdtToTrump = (fromAddress = ALICE, toAddress = BOB) =>
  route(
    "7a9a1eac",
    [
      step("7a9a1eac:0", {
        tool: "lifiIntents",
        name: "LI.FI Intents",
        from: USDT,
        to: SKYAI,
        fromAmount: "100000000",
        toAmount: "2819605417939463473599",
        toAmountMin: "2819605417939463473599",
        fromAddress,
        toAddress: fromAddress,
        feeCosts: [{ name: "LIFI Fixed Fee", amount: "250000", included: true, token: USDT }],
        gas: { amount: "27589130120000", token: ETH },
        executionDuration: 22,
      }),
      step("7a9a1eac:1", {
        tool: "fly",
        name: "Fly",
        from: SKYAI,
        to: TRUMP,
        fromAmount: "2819605417939463473599",
        toAmount: "15863223449369",
        toAmountMin: "15783907332122",
        fromAddress,
        toAddress,
        gas: { amount: "477658000000000", token: BNB },
        executionDuration: 0,
      }),
    ],
    fromAddress,
    toAddress
  )

/** ETH on Base bridged to ARB on Arbitrum in one step (li.quest, 2026-10-28) */
const ethToArb = (fromAddress = ALICE, toAddress = BOB) =>
  route(
    "6d0b71f3",
    [
      step("6d0b71f3:0", {
        tool: "layerswap",
        name: "Layerswap",
        from: BASE_ETH,
        to: ARB,
        fromAmount: "20000000000000000",
        toAmount: "278703679566505460000",
        toAmountMin: "277310161168672900000",
        fromAddress,
        toAddress,
        feeCosts: [
          { name: "LIFI Fixed Fee", amount: "50000000000000", included: true, token: BASE_ETH },
          { name: "LayerSwap fee", amount: "6500000000000", included: true, token: BASE_ETH },
        ],
        gas: { amount: "1500000000000", token: BASE_ETH },
        executionDuration: 7,
      }),
    ],
    fromAddress,
    toAddress
  )

const skyaiToTrump = (fromAmount: string, toAmountMin: string) =>
  route(
    "fresh",
    [
      step("fresh:0", {
        tool: "fly",
        name: "Fly",
        from: SKYAI,
        to: TRUMP,
        fromAmount,
        toAmount: toAmountMin,
        toAmountMin,
        fromAddress: ALICE,
        toAddress: BOB,
        gas: { amount: "477658000000000", token: BNB },
        executionDuration: 0,
      }),
    ],
    ALICE,
    BOB
  )

const withStep = (
  base: Route,
  index: number,
  patch: (step: LiFiStep) => Partial<LiFiStep> & { action: Partial<LiFiStep["action"]> }
): Route => ({
  ...base,
  steps: base.steps.map((step, i) => (i === index ? (patch(step) as LiFiStep) : step)),
})

const network = (id: string, name: string) => ({
  id,
  name,
  platform: "ethereum",
  nativeTokenId: `${id}:evm-native`,
})
const networks: Record<string, ReturnType<typeof network>> = {
  "1": network("1", "Ethereum"),
  "56": network("56", "BNB Chain"),
  "8453": network("8453", "Base"),
  "42161": network("42161", "Arbitrum"),
}

const erc20 = (id: string, token: Token) => ({
  id,
  type: "evm-erc20",
  networkId: String(token.chainId),
  contractAddress: token.address,
  decimals: token.decimals,
  symbol: token.symbol,
})
const native = (id: string, token: Token) => ({
  id,
  type: "evm-native",
  networkId: String(token.chainId),
  decimals: token.decimals,
  symbol: token.symbol,
})
const tokens: Record<string, unknown> = {
  [USDT_ID]: erc20(USDT_ID, USDT),
  [SKYAI_ID]: erc20(SKYAI_ID, SKYAI),
  [TRUMP_ID]: erc20(TRUMP_ID, TRUMP),
  [BASE_ETH_ID]: native(BASE_ETH_ID, BASE_ETH),
  [ARB_ID]: erc20(ARB_ID, ARB),
  "1:evm-native": native("1:evm-native", ETH),
  "56:evm-native": native("56:evm-native", BNB),
}

const mockLifiGetRoutes = vi.fn()
const mockGetStepTransaction = vi.fn()
const mockPrepare = vi.fn()
const mockGetToken$ = vi.fn((tokenId: string) => of(tokens[tokenId] ?? null))
const mockGetNetworksMapById$ = vi.fn(() => of(networks))

vi.mock("@lifi/sdk", () => ({
  createClient: vi.fn(() => ({})),
  getRoutes: (_client: unknown, ...args: unknown[]) => mockLifiGetRoutes(...args),
  getStepTransaction: (_client: unknown, step: LiFiStep) => mockGetStepTransaction(step),
  getTokens: vi.fn().mockResolvedValue({
    tokens: { "1": [USDT], "56": [TRUMP], "8453": [BASE_ETH], "42161": [ARB] },
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

vi.mock("@core/domains/swaps/exports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@core/domains/swaps/exports")>()),
  prepareTransactionRequestWithGasCheck: (...args: unknown[]) => mockPrepare(...args),
}))

vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({
  getExtensionPublicClient: vi.fn(),
}))

vi.mock("../evm-network", () => ({ findEvmPublicClient: async () => ({}) }))

vi.mock("@ui/state/chaindata", () => ({
  getNetworkById$: vi.fn(() => of(null)),
  getNetworksMapById$: () => mockGetNetworksMapById$(),
  getToken$: (tokenId: string) => mockGetToken$(tokenId),
  getTokensMap$: vi.fn(() => of(tokens)),
}))

const { lifiSwapModule } = await import("../lifi-swap-module")

const signal = new AbortController().signal

const quotesFor = async (
  routes: Route[],
  params: Partial<QuoteParams> = {}
): Promise<BaseQuote[]> => {
  mockLifiGetRoutes.mockResolvedValueOnce({
    routes,
    unavailableRoutes: { failed: [], filteredOut: [] },
  } satisfies RoutesResponse)
  const result = await lifiSwapModule.getQuote(
    {
      fromTokenId: USDT_ID,
      toTokenId: TRUMP_ID,
      fromAmount: 100_000_000n,
      fromAddress: ALICE,
      toAddress: BOB,
      input: "exact",
      ...params,
    },
    signal
  )
  return result === null ? [] : Array.isArray(result) ? result : [result]
}

const legData = (leg: QuoteLeg) => leg.data as Route & { stepIndex: number; stepCount: number }

beforeEach(async () => {
  mockLifiGetRoutes.mockReset()
  mockGetStepTransaction.mockReset()
  mockPrepare.mockReset()
  mockGetToken$.mockClear()
  mockGetNetworksMapById$.mockReturnValue(of(networks))
  await lifiSwapModule.getFromAssets(signal)
})

describe("LI.FI multi-step routes", () => {
  it("quotes a two-step route as two legs the user's account chains", async () => {
    const [quote] = await quotesFor([usdtToTrump()])

    expect(quote.subProtocol).toBe("lifiIntents+fly")
    expect(quote.inputAmountBN).toBe(100_000_000n)
    expect(quote.outputAmountBN).toBe(15_783_907_332_122n)
    expect(quote.timeInSec).toBe(22)
    expect(quote.legs).toHaveLength(2)

    const [bridge, swap] = quote.legs
    expect(bridge).toMatchObject({
      protocol: "lifi",
      fromTokenId: USDT_ID,
      toTokenId: SKYAI_ID,
      signer: ALICE,
      recipient: ALICE,
      inputAmount: 100_000_000n,
      outputAmount: 2_819_605_417_939_463_473_599n,
      timeInSec: 22,
    })
    expect(swap).toMatchObject({
      protocol: "lifi",
      fromTokenId: SKYAI_ID,
      toTokenId: TRUMP_ID,
      signer: ALICE,
      recipient: BOB,
      inputAmount: 2_819_605_417_939_463_473_599n,
      outputAmount: 15_783_907_332_122n,
      timeInSec: 0,
    })
    expect(bridge.fees.map((fee) => fee.name)).toEqual(["LIFI Fixed Fee", "Gas", TALISMAN_FEE_NAME])
    expect(swap.fees.map((fee) => fee.name)).toEqual(["Gas"])

    expect(legData(bridge)).toMatchObject({ stepIndex: 0, stepCount: 2, toToken: SKYAI })
    expect(legData(bridge).steps.map((step) => step.tool)).toEqual(["lifiIntents"])
    expect(legData(swap)).toMatchObject({
      stepIndex: 1,
      stepCount: 2,
      fromChainId: 56,
      fromAmount: "2819605417939463473599",
      toAmountMin: "15783907332122",
      fromAddress: ALICE,
      toAddress: BOB,
    })
    expect(legData(swap).steps.map((step) => step.tool)).toEqual(["fly"])
  })

  it("quotes a single-step route as one leg, as before", async () => {
    const [quote] = await quotesFor([ethToArb()], {
      fromTokenId: BASE_ETH_ID,
      toTokenId: ARB_ID,
      fromAmount: 20_000_000_000_000_000n,
    })

    expect(quote.subProtocol).toBe("layerswap")
    expect(quote.legs).toHaveLength(1)
    expect(quote.legs[0]).toMatchObject({
      fromTokenId: BASE_ETH_ID,
      toTokenId: ARB_ID,
      signer: ALICE,
      recipient: BOB,
      inputAmount: 20_000_000_000_000_000n,
      outputAmount: 277_310_161_168_672_900_000n,
    })
    expect(quote.maxNativeTokenGasBuffer).toBe("1500000000000")
    expect(legData(quote.legs[0])).toMatchObject({ stepIndex: 0, stepCount: 1 })
  })

  it("keeps only single-step routes while no account is chosen", async () => {
    const quotes = await quotesFor(
      [usdtToTrump(PLACEHOLDER, PLACEHOLDER), ethToArb(PLACEHOLDER, PLACEHOLDER)],
      {
        fromAddress: null,
        toAddress: null,
      }
    )

    expect(quotes.map((quote) => quote.subProtocol)).toEqual(["layerswap"])
  })

  it.each([
    [
      "an intermediate step pays someone else",
      withStep(usdtToTrump(), 0, (s) => ({ ...s, action: { ...s.action, toAddress: BOB } })),
    ],
    [
      "the last step pays someone else",
      withStep(usdtToTrump(), 1, (s) => ({ ...s, action: { ...s.action, toAddress: ALICE } })),
    ],
    [
      "a step is signed by someone else",
      withStep(usdtToTrump(), 1, (s) => ({ ...s, action: { ...s.action, fromAddress: BOB } })),
    ],
    [
      "the intermediate token is native",
      withStep(usdtToTrump(), 0, (s) => ({ ...s, action: { ...s.action, toToken: BNB } })),
    ],
    [
      "the steps do not chain",
      withStep(usdtToTrump(), 1, (s) => ({ ...s, action: { ...s.action, fromToken: TRUMP } })),
    ],
    [
      "the route has more than three steps",
      { ...usdtToTrump(), steps: [...usdtToTrump().steps, ...usdtToTrump().steps] },
    ],
  ])("drops a multi-step route when %s", async (_, broken) => {
    expect(await quotesFor([broken, ethToArb()])).toHaveLength(1)
  })

  it("drops a multi-step route through a token the wallet does not know", async () => {
    const unknown = { ...SKYAI, address: "0x00000000000000000000000000000000000000aa" }
    const viaUnknown = withStep(
      withStep(usdtToTrump(), 0, (s) => ({ ...s, action: { ...s.action, toToken: unknown } })),
      1,
      (s) => ({ ...s, action: { ...s.action, fromToken: unknown } })
    )
    expect(await quotesFor([viaUnknown])).toEqual([])
    expect(mockGetToken$).toHaveBeenCalledWith(`56:evm-erc20:${unknown.address}`)
  })

  it("drops a multi-step route through a network the wallet does not know", async () => {
    const { "56": _, ...withoutBnb } = networks
    mockGetNetworksMapById$.mockReturnValue(of(withoutBnb))
    expect(await quotesFor([usdtToTrump()])).toEqual([])
  })
})

describe("LI.FI plan leg build", () => {
  const context = { platform: "ethereum" as const }
  const prepared = { to: DIAMOND, data: "0x", value: 0n }

  const buildSwapLeg = async (input: bigint, fresh: Route[], slippage = 0.005) => {
    const [quote] = await quotesFor([usdtToTrump()])
    const leg = quote.legs[1]
    mockLifiGetRoutes.mockResolvedValueOnce({
      routes: fresh,
      unavailableRoutes: { failed: [], filteredOut: [] },
    })
    mockGetStepTransaction.mockImplementation(async (step: LiFiStep) => ({
      transactionRequest: {
        from: ALICE,
        to: DIAMOND,
        data: "0x",
        value: "0",
        chainId: step.action.fromChainId,
        gasLimit: "200000",
      },
    }))
    mockPrepare.mockImplementation(async (_client, _native, tx) => tx)
    return lifiSwapModule.buildLeg({
      leg,
      input,
      slippage,
      exchange: null,
      context: context as never,
    })
  }

  it("re-quotes a later leg at what landed, without the Talisman fee", async () => {
    const landed = 2_800_000_000_000_000_000_000n

    const built = await buildSwapLeg(landed, [skyaiToTrump(landed.toString(), "15700000000000")])

    const [request] = mockLifiGetRoutes.mock.calls.at(-1) as [Record<string, unknown>]
    expect(request).toMatchObject({
      fromAddress: ALICE,
      toAddress: BOB,
      fromChainId: 56,
      toChainId: 56,
      fromAmount: landed.toString(),
      options: { integrator: "talisman", fee: 0, slippage: 0.005 },
    })
    expect(built.expectedOutput).toBe(15_700_000_000_000n)
    expect(built.fees.map((fee) => fee.name)).toEqual(["Gas"])
    expect(built.txInfo).toMatchObject({
      type: "swap-lifi",
      protocolName: "fly",
      fromAmount: landed.toString(),
      toAmount: "15700000000000",
    })
    expect(mockGetStepTransaction.mock.calls[0][0].action.fromAmount).toBe(landed.toString())
    expect(mockPrepare).toHaveBeenCalledWith({}, "56:evm-native", expect.objectContaining(prepared))
  })

  it("refuses a later leg whose fresh rate fell below what the user accepted", async () => {
    const landed = 2_800_000_000_000_000_000_000n

    await expect(
      buildSwapLeg(landed, [skyaiToTrump(landed.toString(), "15000000000000")])
    ).rejects.toThrow("moved too far")
    expect(mockGetStepTransaction).not.toHaveBeenCalled()
  })

  it("refuses a later leg LI.FI no longer routes", async () => {
    await expect(buildSwapLeg(2_800_000_000_000_000_000_000n, [])).rejects.toThrow("No route")
  })
})
