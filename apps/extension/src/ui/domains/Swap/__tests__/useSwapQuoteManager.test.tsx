import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor as waitForWithDefaultInterval } from "@testing-library/react"
import BigNumber from "bignumber.js"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type {
  BaseQuote,
  SupportedSwapProtocol,
  SwapModule,
} from "../swap-modules/common.swap-module"
import { quoteFromLegs } from "../swap-modules/helpers"

const account = "0x8eb8a3b98659cce290402893d0123abb75e3ab28"

const getQuoteMock = vi.fn()

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))

const held = vi.hoisted(() => {
  const balancesOf = (planckByTokenId: Record<string, bigint>) => ({
    status: "live",
    balances: {
      find: ({ tokenId }: { tokenId: string }) => ({
        each:
          planckByTokenId[tokenId] === undefined
            ? []
            : [{ token: { decimals: 0 }, transferable: { planck: planckByTokenId[tokenId] } }],
      }),
    },
  })
  const held = {
    current: balancesOf({}),
    set: (planckByTokenId: Record<string, bigint>) => {
      held.current = balancesOf(planckByTokenId)
    },
  }
  return held
})
vi.mock("@ui/hooks/useBalancesByParams", () => ({ useBalancesByParams: () => held.current }))

vi.mock("@ui/state/tokenRates", () => ({
  useTokenRatesMap: () => ({ "from-token": { usd: { price: 25 } } }),
}))

vi.mock("@ui/state/chaindata", () => {
  const tokensMap = {
    "from-token": { id: "from-token", decimals: 0 },
    "dest-native": { id: "dest-native", decimals: 0 },
  }
  return {
    useTokensMap: () => tokensMap,
    useToken: (tokenId?: string) =>
      tokenId === "from-token"
        ? { id: tokenId, symbol: "DOT", __isKnown: true, decimals: 0, networkId: "polkadot" }
        : tokenId === "to-token"
          ? { id: tokenId, symbol: "USDC", __isKnown: true, decimals: 6, networkId: "ethereum" }
          : null,
    useNetworkById: (networkId?: string) =>
      networkId ? { id: networkId, nativeTokenId: "from-token", __isKnown: true } : null,
  }
})

vi.mock("../swaps.api", () => {
  const swapModules = [
    {
      protocol: "lifi",
      decentralisationScore: 2,
      getFromAssets: async () => [],
      getToAssets: async () => [],
      getQuote: (params: Parameters<SwapModule["getQuote"]>[0], signal: AbortSignal) =>
        getQuoteMock(params, signal),
      buildLeg: async () => {
        throw new Error("not built in quote tests")
      },
    } satisfies SwapModule,
  ]
  return { swapModules, useSwapModules: () => swapModules }
})

import { useSwapQuoteManager } from "../hooks/useSwapQuoteManager"

// renderHook paints no DOM, so waitFor only polls: at its default 50ms each wait costs a frame
const waitFor = (check: () => void) => waitForWithDefaultInterval(check, { interval: 5 })

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

const makeQuote = (outputAmountBN: bigint, fees: BaseQuote["fees"] = []): BaseQuote =>
  quoteFromLegs(
    [
      {
        protocol: "lifi",
        fromTokenId: "from-token",
        toTokenId: "to-token",
        signer: account,
        recipient: null,
        inputAmount: 1n,
        outputAmount: outputAmountBN,
        fees,
        timeInSec: 30,
      },
    ],
    {
      decentralisationScore: 2,
      protocol: "lifi",
      providerLogo: "https://example.com/logo.png",
      providerName: "LI.FI",
    }
  )

const fromSupportMap = new Map<string, Set<SupportedSwapProtocol>>([
  ["from-token", new Set(["lifi"])],
])

const toSupportMap = new Map<string, Set<SupportedSwapProtocol>>([["to-token", new Set(["lifi"])]])

const pair = {
  from_network_id: "polkadot",
  to_network_id: "ethereum",
  from_symbol: "DOT",
  to_symbol: "USDC",
  from_token_id: "from-token",
  to_token_id: "to-token",
}

describe("useSwapQuoteManager", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    getQuoteMock.mockReset()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
    held.set({})
  })

  it("lists a route whose fees on top cost more than the account holds last, with what it lacks", async () => {
    held.set({ "from-token": 10n })
    const bridgeFee = { amount: BigNumber(195), name: "Bridge Fee", tokenId: "from-token" }
    const glacis = makeQuote(300n, [{ ...bridgeFee, additional: true }])
    const across = makeQuote(200n)
    getQuoteMock.mockResolvedValue([glacis, across])

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () =>
        useSwapQuoteManager({
          fromTokenId: "from-token",
          toTokenId: "to-token",
          fromSupportMap,
          toSupportMap,
          fromAmount: 1n,
          fromAddress: account,
          toAddress: "0x222",
          selectedProtocol: null,
          selectedSubProtocol: undefined,
          quoteSorting: "bestRate",
        }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.sortedQuotes).toHaveLength(2))
    expect(result.current.sortedQuotes.map(({ quote, shortfall }) => [quote, shortfall])).toEqual([
      [across, null],
      [glacis, { tokenId: "from-token", required: 196n, available: 10n }],
    ])
    expect(result.current.selectedQuote).toBe(across)
  })

  it("lists a route last when the account cannot pay a later leg's gas on that leg's network", async () => {
    held.set({ "from-token": 1000n })
    const twoLegs = quoteFromLegs(
      [
        {
          protocol: "lifi",
          fromTokenId: "from-token",
          toTokenId: "10:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
          signer: account,
          recipient: account,
          inputAmount: 1n,
          outputAmount: 1n,
          fees: [],
          timeInSec: 30,
        },
        {
          protocol: "lifi",
          fromTokenId: "10:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
          toTokenId: "to-token",
          signer: account,
          recipient: null,
          inputAmount: 1n,
          outputAmount: 300n,
          fees: [{ amount: BigNumber(3), name: "Gas", tokenId: "dest-native", gas: true }],
          timeInSec: 30,
        },
      ],
      {
        decentralisationScore: 2,
        protocol: "lifi",
        providerLogo: "https://example.com/logo.png",
        providerName: "LI.FI",
      }
    )
    const direct = makeQuote(200n)
    getQuoteMock.mockResolvedValue([twoLegs, direct])

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () =>
        useSwapQuoteManager({
          fromTokenId: "from-token",
          toTokenId: "to-token",
          fromSupportMap,
          toSupportMap,
          fromAmount: 1n,
          fromAddress: account,
          toAddress: "0x222",
          selectedProtocol: null,
          selectedSubProtocol: undefined,
          quoteSorting: "bestRate",
        }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.sortedQuotes[1]?.shortfall).toBeTruthy())
    expect(result.current.sortedQuotes.map(({ quote, shortfall }) => [quote, shortfall])).toEqual([
      [direct, null],
      [twoLegs, { tokenId: "dest-native", required: 3n, available: 0n }],
    ])
    expect(result.current.selectedQuote).toBe(direct)
  })

  it("keeps the confirmed route while the quote is frozen, even if the balance drops", async () => {
    held.set({ "from-token": 1000n })
    const bridgeFee = { amount: BigNumber(195), name: "Bridge Fee", tokenId: "from-token" }
    const glacis = makeQuote(300n, [{ ...bridgeFee, additional: true }])
    getQuoteMock.mockResolvedValue([glacis, makeQuote(200n)])

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    let freezeQuote = false
    const { result, rerender } = renderHook(
      () =>
        useSwapQuoteManager({
          fromTokenId: "from-token",
          toTokenId: "to-token",
          fromSupportMap,
          toSupportMap,
          fromAmount: 1n,
          fromAddress: account,
          toAddress: "0x222",
          selectedProtocol: null,
          selectedSubProtocol: undefined,
          quoteSorting: "bestRate",
          freezeQuote,
        }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.selectedQuote).toBe(glacis))

    freezeQuote = true
    rerender()
    held.set({ "from-token": 10n })
    rerender()

    expect(result.current.selectedQuote).toBe(glacis)
  })

  it("keeps the previous quotes available while a new amount is refetching", async () => {
    const pendingQuotes: Deferred<BaseQuote[] | null>[] = []

    getQuoteMock.mockImplementation(() => {
      const pending = createDeferred<BaseQuote[] | null>()
      pendingQuotes.push(pending)
      return pending.promise
    })

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    let params = {
      fromTokenId: "from-token",
      toTokenId: "to-token",
      fromSupportMap,
      toSupportMap,
      fromAmount: 1n,
      fromAddress: account,
      toAddress: "0x222",
      selectedProtocol: null,
      selectedSubProtocol: undefined,
      quoteSorting: "bestRate" as const,
      slippagePercent: 0.5,
    }

    const { result, rerender } = renderHook(() => useSwapQuoteManager(params), { wrapper })

    await waitFor(() => expect(getQuoteMock).toHaveBeenCalledTimes(1))
    expect(result.current.isLoadingQuotes).toBe(true)

    pendingQuotes[0]?.resolve([makeQuote(100n)])

    await waitFor(() => {
      expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(100n)
      expect(result.current.isQuoteDataCurrent).toBe(true)
    })

    params = { ...params, fromAmount: 2n }
    rerender()

    await waitFor(() => expect(getQuoteMock).toHaveBeenCalledTimes(2))

    expect(result.current.isLoadingQuotes).toBe(false)
    expect(result.current.isQuoteDataCurrent).toBe(false)
    expect(result.current.isAllQuotesSettled).toBe(false)
    expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(100n)
    expect(result.current.toAmount).toBe(100n)

    pendingQuotes[1]?.resolve([makeQuote(200n)])

    await waitFor(() => {
      expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(200n)
      expect(result.current.isQuoteDataCurrent).toBe(true)
    })
  })

  it("requotes for a validator picked on the confirm screen, though the quote is frozen", async () => {
    const pendingQuotes: Deferred<BaseQuote[] | null>[] = []
    getQuoteMock.mockImplementation(() => {
      const pending = createDeferred<BaseQuote[] | null>()
      pendingQuotes.push(pending)
      return pending.promise
    })

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    let params: Parameters<typeof useSwapQuoteManager>[0] = {
      fromTokenId: "from-token",
      toTokenId: "to-token",
      fromSupportMap,
      toSupportMap,
      fromAmount: 1n,
      fromAddress: account,
      toAddress: "0x222",
      selectedProtocol: null,
      selectedSubProtocol: undefined,
      quoteSorting: "bestRate" as const,
      freezeQuote: true,
    }
    const { result, rerender } = renderHook(() => useSwapQuoteManager(params), { wrapper })

    await waitFor(() => expect(getQuoteMock).toHaveBeenCalledTimes(1))
    pendingQuotes[0]?.resolve([makeQuote(100n)])
    await waitFor(() => expect(result.current.isQuoteDataCurrent).toBe(true))

    params = { ...params, stakeHotkey: "5Picked" }
    rerender()

    await waitFor(() => expect(getQuoteMock).toHaveBeenCalledTimes(2))
    expect(getQuoteMock.mock.calls[1][0]).toMatchObject({ stakeHotkey: "5Picked" })
    expect(result.current.isQuoteDataCurrent).toBe(false)
    expect(result.current.selectedQuote?.outputAmountBN).toBe(100n)

    pendingQuotes[1]?.resolve([makeQuote(101n)])

    await waitFor(() => {
      expect(result.current.selectedQuote?.outputAmountBN).toBe(101n)
      expect(result.current.isQuoteDataCurrent).toBe(true)
    })
  })

  it("reports quotes once per amount and token pair, not on a refresh", async () => {
    track.mockClear()
    getQuoteMock.mockResolvedValueOnce([makeQuote(100n)])
    getQuoteMock.mockResolvedValueOnce([makeQuote(101n)])
    getQuoteMock.mockRejectedValueOnce(new Error("Quote failed"))

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    let params = {
      fromTokenId: "from-token",
      toTokenId: "to-token",
      fromSupportMap,
      toSupportMap,
      fromAmount: 1n,
      fromAddress: account,
      toAddress: "0x222",
      selectedProtocol: null,
      selectedSubProtocol: undefined,
      quoteSorting: "bestRate" as const,
    }
    const { result, rerender } = renderHook(() => useSwapQuoteManager(params), { wrapper })

    await waitFor(() => expect(result.current.sortedQuotes).toHaveLength(1))
    await queryClient.refetchQueries({ queryKey: ["swap-quote"] })
    await waitFor(() => expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(101n))

    expect(track.mock.calls).toEqual([
      [
        "swap_quote_received",
        {
          quote_count: 1,
          protocols: ["lifi"],
          latency_ms: expect.any(Number),
          ...pair,
          usd_bucket: "10-100",
        },
      ],
    ])

    params = { ...params, fromAmount: 2n }
    rerender()

    await waitFor(() => expect(track).toHaveBeenCalledTimes(2))
    expect(track).toHaveBeenLastCalledWith("swap_quote_failed", {
      protocol: "lifi",
      error_category: "unknown",
      ...pair,
      usd_bucket: "10-100",
    })
  })
})
