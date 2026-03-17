import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type {
  BaseQuote,
  SupportedSwapProtocol,
  SwapModule,
} from "../swap-modules/common.swap-module"

const lifiGetQuoteMock = vi.fn()
const simpleswapGetQuoteMock = vi.fn()

vi.mock("@ui/state/tokenRates", () => ({
  useTokenRatesMap: () => ({}),
}))

vi.mock("../swaps.api", () => ({
  swapModules: [
    {
      protocol: "lifi",
      decentralisationScore: 2,
      getFromAssets: async () => [],
      getToAssets: async () => [],
      getQuote: (params: Parameters<SwapModule["getQuote"]>[0], signal: AbortSignal) =>
        lifiGetQuoteMock(params, signal),
      createExchange: async () => null,
      getTransaction: async () => null,
    } satisfies SwapModule,
    {
      protocol: "simpleswap",
      decentralisationScore: 1,
      getFromAssets: async () => [],
      getToAssets: async () => [],
      getQuote: (params: Parameters<SwapModule["getQuote"]>[0], signal: AbortSignal) =>
        simpleswapGetQuoteMock(params, signal),
      createExchange: async () => null,
      getTransaction: async () => null,
    } satisfies SwapModule,
  ],
}))

// eslint-disable-next-line import/first
import { useSwapQuoteManager } from "../hooks/useSwapQuoteManager"

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

const makeLifiQuote = (outputAmountBN: bigint): BaseQuote => ({
  decentralisationScore: 2,
  protocol: "lifi",
  outputAmountBN,
  inputAmountBN: 1n,
  fees: [],
  timeInSec: 30,
  providerLogo: "https://example.com/lifi.png",
  providerName: "LI.FI",
})

const makeSimpleswapQuote = (outputAmountBN: bigint): BaseQuote => ({
  decentralisationScore: 1,
  protocol: "simpleswap",
  outputAmountBN,
  inputAmountBN: 1n,
  fees: [],
  timeInSec: 60,
  providerLogo: "https://example.com/simpleswap.png",
  providerName: "SimpleSwap",
})

const fromSupportMap = new Map<string, Set<SupportedSwapProtocol>>([
  ["from-token", new Set(["lifi", "simpleswap"])],
])

const toSupportMap = new Map<string, Set<SupportedSwapProtocol>>([
  ["to-token", new Set(["lifi", "simpleswap"])],
])

describe("useSwapQuoteManager – multi-provider", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    lifiGetQuoteMock.mockReset()
    simpleswapGetQuoteMock.mockReset()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  it("is not settled until all providers respond", async () => {
    const lifiDeferred = createDeferred<BaseQuote | null>()
    const simpleswapDeferred = createDeferred<BaseQuote | null>()

    lifiGetQuoteMock.mockReturnValue(lifiDeferred.promise)
    simpleswapGetQuoteMock.mockReturnValue(simpleswapDeferred.promise)

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const params = {
      fromTokenId: "from-token",
      toTokenId: "to-token",
      fromSupportMap,
      toSupportMap,
      fromAmount: 1n,
      fromAddress: "0xaaa",
      toAddress: "0xbbb",
      selectedProtocol: null as SupportedSwapProtocol | null,
      selectedSubProtocol: undefined,
      quoteSorting: "bestRate" as const,
      lifiSlippagePercent: 0.5,
    }

    const { result } = renderHook(() => useSwapQuoteManager(params), { wrapper })

    await waitFor(() => {
      expect(lifiGetQuoteMock).toHaveBeenCalledTimes(1)
      expect(simpleswapGetQuoteMock).toHaveBeenCalledTimes(1)
    })

    // Only resolve the first provider — should NOT be settled yet
    simpleswapDeferred.resolve(makeSimpleswapQuote(100n))

    await waitFor(() => expect(result.current.sortedQuotes.length).toBeGreaterThan(0))
    expect(result.current.isAllQuotesSettled).toBe(false)

    // Now resolve the second provider
    lifiDeferred.resolve(makeLifiQuote(200n))

    await waitFor(() => expect(result.current.isAllQuotesSettled).toBe(true))
    expect(result.current.sortedQuotes).toHaveLength(2)
  })

  it("selects the best rate after all providers settle (not the first to arrive)", async () => {
    const lifiDeferred = createDeferred<BaseQuote | null>()
    const simpleswapDeferred = createDeferred<BaseQuote | null>()

    lifiGetQuoteMock.mockReturnValue(lifiDeferred.promise)
    simpleswapGetQuoteMock.mockReturnValue(simpleswapDeferred.promise)

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const params = {
      fromTokenId: "from-token",
      toTokenId: "to-token",
      fromSupportMap,
      toSupportMap,
      fromAmount: 1n,
      fromAddress: "0xaaa",
      toAddress: "0xbbb",
      selectedProtocol: null as SupportedSwapProtocol | null,
      selectedSubProtocol: undefined,
      quoteSorting: "bestRate" as const,
      lifiSlippagePercent: 0.5,
    }

    const { result } = renderHook(() => useSwapQuoteManager(params), { wrapper })

    await waitFor(() => {
      expect(lifiGetQuoteMock).toHaveBeenCalledTimes(1)
      expect(simpleswapGetQuoteMock).toHaveBeenCalledTimes(1)
    })

    // First to arrive has a worse rate
    simpleswapDeferred.resolve(makeSimpleswapQuote(100n))

    await waitFor(() => expect(result.current.sortedQuotes.length).toBe(1))

    // With selectedProtocol=null, selectedQuote falls back to sortedQuotes[0]
    // At this point only simpleswap has arrived
    expect(result.current.selectedQuote?.protocol).toBe("simpleswap")
    expect(result.current.isAllQuotesSettled).toBe(false)

    // Second to arrive has a better rate
    lifiDeferred.resolve(makeLifiQuote(200n))

    await waitFor(() => expect(result.current.isAllQuotesSettled).toBe(true))

    // Now sortedQuotes[0] should be lifi (best rate = highest output)
    expect(result.current.sortedQuotes[0]?.quote.protocol).toBe("lifi")
    expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(200n)
    // selectedQuote (with selectedProtocol=null) picks the best
    expect(result.current.selectedQuote?.protocol).toBe("lifi")
  })

  it("marks quote data as not current when inputs change, then current after new quotes settle", async () => {
    const pendingLifi: Deferred<BaseQuote | null>[] = []
    const pendingSimpleswap: Deferred<BaseQuote | null>[] = []

    lifiGetQuoteMock.mockImplementation(() => {
      const d = createDeferred<BaseQuote | null>()
      pendingLifi.push(d)
      return d.promise
    })
    simpleswapGetQuoteMock.mockImplementation(() => {
      const d = createDeferred<BaseQuote | null>()
      pendingSimpleswap.push(d)
      return d.promise
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
      fromAddress: "0xaaa",
      toAddress: "0xbbb",
      selectedProtocol: null as SupportedSwapProtocol | null,
      selectedSubProtocol: undefined,
      quoteSorting: "bestRate" as const,
      lifiSlippagePercent: 0.5,
    }

    const { result, rerender } = renderHook(() => useSwapQuoteManager(params), { wrapper })

    // Wait for initial queries to fire
    await waitFor(() => {
      expect(lifiGetQuoteMock).toHaveBeenCalledTimes(1)
      expect(simpleswapGetQuoteMock).toHaveBeenCalledTimes(1)
    })

    // Resolve both initial quotes
    pendingLifi[0]?.resolve(makeLifiQuote(200n))
    pendingSimpleswap[0]?.resolve(makeSimpleswapQuote(100n))

    await waitFor(() => expect(result.current.isAllQuotesSettled).toBe(true))
    expect(result.current.isQuoteDataCurrent).toBe(true)
    expect(result.current.selectedQuote?.protocol).toBe("lifi")

    // Change the input amount
    params = { ...params, fromAmount: 5n }
    rerender()

    await waitFor(() => {
      expect(lifiGetQuoteMock).toHaveBeenCalledTimes(2)
      expect(simpleswapGetQuoteMock).toHaveBeenCalledTimes(2)
    })

    // Data should not be current while new quotes are pending
    expect(result.current.isQuoteDataCurrent).toBe(false)
    expect(result.current.isAllQuotesSettled).toBe(false)

    // Resolve new quotes — this time simpleswap has the better rate
    pendingSimpleswap[1]?.resolve(makeSimpleswapQuote(900n))
    pendingLifi[1]?.resolve(makeLifiQuote(800n))

    await waitFor(() => expect(result.current.isAllQuotesSettled).toBe(true))
    expect(result.current.isQuoteDataCurrent).toBe(true)

    // Best rate should now be simpleswap
    expect(result.current.sortedQuotes[0]?.quote.protocol).toBe("simpleswap")
    expect(result.current.selectedQuote?.protocol).toBe("simpleswap")
  })
})
