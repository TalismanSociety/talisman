import { useQueries } from "@tanstack/react-query"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { useMemo } from "react"

import type {
  BaseQuote,
  SupportedSwapProtocol,
  SwapModule,
} from "../swap-modules/common.swap-module"
import { swapModules } from "../swaps.api"
import { attachFees, flattenQuotes, selectQuote, sortQuotes } from "./quote-sorting"

/**
 * Fetches quotes from all applicable swap modules using useQueries,
 * sorts them, and derives the selected quote, module, and output amount.
 */
export const useSwapQuoteManager = (params: {
  fromTokenId: string | null
  toTokenId: string | null
  supportMap: Map<string, Set<SupportedSwapProtocol>> | null
  fromAmount: bigint | null
  fromAddress: string | null
  toAddress: string | null
  selectedProtocol: SupportedSwapProtocol | null
  selectedSubProtocol: string | undefined
  quoteSorting: "decentalised" | "cheapest" | "fastest" | "bestRate"
  enabled?: boolean
}) => {
  const {
    fromTokenId,
    toTokenId,
    supportMap,
    fromAmount,
    fromAddress,
    toAddress,
    selectedProtocol,
    selectedSubProtocol,
    quoteSorting,
    enabled: enabledProp = true,
  } = params

  const tokenRates = useTokenRatesMap()

  const enabled = enabledProp && Boolean(fromTokenId && toTokenId && fromAmount)

  const applicableModules = useMemo(
    () =>
      fromTokenId && toTokenId && supportMap
        ? swapModules.filter(
            (m) =>
              supportMap.get(fromTokenId)?.has(m.protocol) &&
              supportMap.get(toTokenId)?.has(m.protocol)
          )
        : [],
    [fromTokenId, toTokenId, supportMap]
  )

  const queryResults = useQueries({
    queries: applicableModules.map((module) => ({
      queryKey: [
        "swap-quote",
        module.protocol,
        fromTokenId,
        toTokenId,
        fromAmount?.toString(),
        fromAddress,
        toAddress,
        selectedSubProtocol,
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        module.getQuote(
          {
            fromTokenId,
            toTokenId,
            fromAmount,
            fromAddress,
            toAddress,
            selectedSubProtocol,
          },
          signal
        ),
      enabled,
      refetchInterval: 20_000,
      retry: false,
    })),
  })

  // Per-module loading states
  const isLoadingQuotes = queryResults.some((r) => r.isLoading)
  const isAllQuotesSettled =
    queryResults.every((r) => !r.isLoading && !r.isFetching) ||
    (!enabled && queryResults.length === 0)
  const hasQuoteError = queryResults.length > 0 && queryResults.every((r) => r.isError)

  // Stable dependency: only changes when actual query data updates
  // (useQueries returns a new array reference every render, so we can't use it directly)
  const quotesDataKey = queryResults.map((r) => r.dataUpdatedAt).join(",")

  // biome-ignore lint/correctness/useExhaustiveDependencies: quotesDataKey is an intentional stable proxy for queryResults (useQueries returns a new array ref every render)
  const sortedQuotes: { quote: BaseQuote; fees: number }[] = useMemo(() => {
    const flatQuotes = flattenQuotes(queryResults.map((r) => r.data))
    const withFees = attachFees(flatQuotes, tokenRates)
    return sortQuotes(withFees, quoteSorting)
  }, [quotesDataKey, tokenRates, quoteSorting])

  // Selected quote
  const selectedQuote: BaseQuote | null = useMemo(
    () => selectQuote(sortedQuotes, selectedProtocol, selectedSubProtocol),
    [sortedQuotes, selectedProtocol, selectedSubProtocol]
  )

  const selectedQuoteFees: number | undefined = useMemo(() => {
    if (!selectedQuote) return undefined
    return sortedQuotes.find(({ quote }) => quote === selectedQuote)?.fees
  }, [sortedQuotes, selectedQuote])

  // Selected module
  const selectedModule: SwapModule | undefined = useMemo(() => {
    if (!selectedQuote) return undefined
    return swapModules.find((m) => m.protocol === selectedQuote.protocol)
  }, [selectedQuote])

  // Output amount
  const toAmount: bigint | null = useMemo(() => {
    if (!selectedQuote?.outputAmountBN) return null
    return selectedQuote.outputAmountBN
  }, [selectedQuote])

  return {
    isLoadingQuotes,
    isAllQuotesSettled,
    hasQuoteError,
    sortedQuotes,
    selectedQuote,
    selectedQuoteFees,
    selectedModule,
    toAmount,
  }
}
