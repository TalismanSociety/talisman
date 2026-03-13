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
        getQuoteMock(params, signal),
      createExchange: async () => undefined,
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

const supportMap = new Map<string, Set<SupportedSwapProtocol>>([
  ["from-token", new Set(["lifi"])],
  ["to-token", new Set(["lifi"])],
])

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
      supportMap,
      fromAmount: 1n,
      fromAddress: "0x111",
      toAddress: "0x222",
      selectedProtocol: null,
      selectedSubProtocol: undefined,
      quoteSorting: "bestRate" as const,
    }

    const { result, rerender } = renderHook(() => useSwapQuoteManager(params), { wrapper })

    await waitFor(() => expect(getQuoteMock).toHaveBeenCalledTimes(1))

    pendingQuotes[0]?.resolve([makeQuote(100n)])

    await waitFor(() => expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(100n))

    params = { ...params, fromAmount: 2n }
    rerender()

    await waitFor(() => expect(getQuoteMock).toHaveBeenCalledTimes(2))

    expect(result.current.isAllQuotesSettled).toBe(false)
    expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(100n)

    pendingQuotes[1]?.resolve([makeQuote(200n)])

    await waitFor(() => expect(result.current.sortedQuotes[0]?.quote.outputAmountBN).toBe(200n))
  })
})
