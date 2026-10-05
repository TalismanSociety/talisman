import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type {
  BaseQuote,
  SupportedSwapProtocol,
  SwapModule,
} from "../swap-modules/common.swap-module"

const getQuoteMock = vi.fn()

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))

vi.mock("@ui/state/tokenRates", () => ({
  useTokenRatesMap: () => ({ "from-token": { usd: { price: 25 } } }),
}))

vi.mock("@ui/state/chaindata", () => ({
  useToken: (tokenId?: string) =>
    tokenId === "from-token"
      ? { id: tokenId, symbol: "DOT", __isKnown: true, decimals: 0, networkId: "polkadot" }
      : tokenId === "to-token"
        ? { id: tokenId, symbol: "USDC", __isKnown: true, decimals: 6, networkId: "ethereum" }
        : null,
  useNetworkById: (networkId?: string) => (networkId ? { id: networkId, __isKnown: true } : null),
}))

vi.mock("../swaps.api", () => {
  const swapModules = [
    {
      protocol: "lifi",
      decentralisationScore: 2,
      getFromAssets: async () => [],
      getToAssets: async () => [],
      getQuote: (params: Parameters<SwapModule["getQuote"]>[0], signal: AbortSignal) =>
        getQuoteMock(params, signal),
      createExchange: async () => null,
      getTransaction: async () => null,
    } satisfies SwapModule,
  ]
  return { swapModules, useSwapModules: () => swapModules }
})

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

const makeQuote = (outputAmountBN: bigint): BaseQuote => ({
  decentralisationScore: 2,
  protocol: "lifi",
  outputAmountBN,
  inputAmountBN: 1n,
  fees: [],
  timeInSec: 30,
  providerLogo: "https://example.com/logo.png",
  providerName: "LI.FI",
})

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
      fromAddress: "0x111",
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

    await waitFor(() => expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(100n))
    expect(result.current.isQuoteDataCurrent).toBe(true)

    params = { ...params, fromAmount: 2n }
    rerender()

    await waitFor(() => expect(getQuoteMock).toHaveBeenCalledTimes(2))

    expect(result.current.isLoadingQuotes).toBe(false)
    expect(result.current.isQuoteDataCurrent).toBe(false)
    expect(result.current.isAllQuotesSettled).toBe(false)
    expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(100n)
    expect(result.current.toAmount).toBe(100n)

    pendingQuotes[1]?.resolve([makeQuote(200n)])

    await waitFor(() => expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(200n))
    expect(result.current.isQuoteDataCurrent).toBe(true)
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
      fromAddress: "0x111",
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
