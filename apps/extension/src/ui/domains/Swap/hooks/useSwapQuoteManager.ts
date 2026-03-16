import { keepPreviousData, useQueries } from "@tanstack/react-query"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { useEffect, useMemo, useState } from "react"

import type {
  BaseQuote,
  SupportedSwapProtocol,
  SwapModule,
} from "../swap-modules/common.swap-module"
import { swapModules } from "../swaps.api"
import { attachFees, flattenQuotes, selectQuote, sortQuotes } from "./quote-sorting"

const areSortedQuotesEqual = (
  left: { quote: BaseQuote; fees: number }[],
  right: { quote: BaseQuote; fees: number }[]
): boolean =>
  left.length === right.length &&
  left.every(
    ({ quote, fees }, index) => right[index]?.quote === quote && right[index]?.fees === fees
  )

type QuoteQueryData = BaseQuote | BaseQuote[] | null

const isBaseQuote = (value: unknown): value is BaseQuote =>
  typeof value === "object" &&
  value !== null &&
  "inputAmountBN" in value &&
  "outputAmountBN" in value &&
  "protocol" in value

const normalizeQuoteData = (value: unknown): QuoteQueryData | undefined => {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.filter(isBaseQuote)
  return isBaseQuote(value) ? value : undefined
}

/**
 * Fetches quotes from all applicable swap modules using useQueries,
 * sorts them, and derives the selected quote, module, and output amount.
 */
export const useSwapQuoteManager = (params: {
  fromTokenId: string | null
  toTokenId: string | null
  fromSupportMap: Map<string, Set<SupportedSwapProtocol>> | null
  toSupportMap: Map<string, Set<SupportedSwapProtocol>> | null
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
    fromSupportMap,
    toSupportMap,
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
  const quoteInputKey = useMemo(
    () =>
      [
        fromTokenId ?? "",
        toTokenId ?? "",
        fromAmount?.toString() ?? "",
        fromAddress ?? "",
        toAddress ?? "",
      ].join("|"),
    [fromAmount, fromAddress, fromTokenId, toAddress, toTokenId]
  )

  const applicableModules = useMemo(
    () =>
      fromTokenId && toTokenId && fromSupportMap && toSupportMap
        ? swapModules.filter(
            (m) =>
              fromSupportMap.get(fromTokenId)?.has(m.protocol) &&
              toSupportMap.get(toTokenId)?.has(m.protocol)
          )
        : [],
    [fromTokenId, toTokenId, fromSupportMap, toSupportMap]
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
      placeholderData: keepPreviousData,
      refetchInterval: 20_000,
      retry: false,
    })),
  })

  const isAllQuotesSettled =
    queryResults.every((r) => !r.isLoading && !r.isFetching) ||
    (!enabled && queryResults.length === 0)
  const hasQuoteError = queryResults.length > 0 && queryResults.every((r) => r.isError)

  // Stable dependency: only changes when actual query data updates
  // (useQueries returns a new array reference every render, so we can't use it directly)
  const quotesDataKey = queryResults.map((r) => r.dataUpdatedAt).join(",")

  // biome-ignore lint/correctness/useExhaustiveDependencies: quotesDataKey is an intentional stable proxy for queryResults (useQueries returns a new array ref every render)
  const liveSortedQuotes: { quote: BaseQuote; fees: number }[] = useMemo(() => {
    const flatQuotes = flattenQuotes(queryResults.map((r) => normalizeQuoteData(r.data)))
    const withFees = attachFees(flatQuotes, tokenRates)
    return sortQuotes(withFees, quoteSorting)
  }, [quotesDataKey, tokenRates, quoteSorting])

  const [staleSortedQuotes, setStaleSortedQuotes] = useState<typeof liveSortedQuotes>([])

  useEffect(() => {
    if (!enabled) {
      setStaleSortedQuotes((previous) => (previous.length === 0 ? previous : []))
      return
    }

    if (liveSortedQuotes.length > 0) {
      setStaleSortedQuotes((previous) =>
        areSortedQuotesEqual(previous, liveSortedQuotes) ? previous : liveSortedQuotes
      )
      return
    }

    if (isAllQuotesSettled) {
      setStaleSortedQuotes((previous) => (previous.length === 0 ? previous : []))
    }
  }, [enabled, liveSortedQuotes, isAllQuotesSettled])

  const sortedQuotes = liveSortedQuotes.length > 0 ? liveSortedQuotes : staleSortedQuotes
  const isLoadingQuotes = queryResults.some((r) => r.isLoading) && sortedQuotes.length === 0
  const [lastSettledQuoteInputKey, setLastSettledQuoteInputKey] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLastSettledQuoteInputKey(null)
      return
    }

    if (isAllQuotesSettled) {
      setLastSettledQuoteInputKey((previous) =>
        previous === quoteInputKey ? previous : quoteInputKey
      )
    }
  }, [enabled, isAllQuotesSettled, quoteInputKey])

  const isQuoteDataCurrent = !enabled || lastSettledQuoteInputKey === quoteInputKey

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
    isQuoteDataCurrent,
    isAllQuotesSettled,
    hasQuoteError,
    sortedQuotes,
    selectedQuote,
    selectedQuoteFees,
    selectedModule,
    toAmount,
  }
}
