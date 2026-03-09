// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import { useQueries } from "@tanstack/react-query"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import BigNumber from "bignumber.js"
import { useMemo } from "react"

import type {
  BaseQuote,
  SupportedSwapProtocol,
  SwapModule,
  SwappableAssetWithDecimals,
} from "../swap-modules/common.swap-module"
import { swapModules } from "../swaps.api"
import { Decimal } from "../swaps-port/Decimal"

/**
 * Fetches quotes from all applicable swap modules using useQueries,
 * sorts them, and derives the selected quote, module, and output amount.
 */
export const useSwapQuoteManager = (params: {
  fromAsset: SwappableAssetWithDecimals | null
  toAsset: SwappableAssetWithDecimals | null
  fromAmount: Decimal
  fromAddress: string | null
  toAddress: string | null
  selectedProtocol: SupportedSwapProtocol | null
  selectedSubProtocol: string | undefined
  quoteSorting: "decentalised" | "cheapest" | "fastest" | "bestRate"
}) => {
  const {
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedProtocol,
    selectedSubProtocol,
    quoteSorting,
  } = params

  const tokenRates = useTokenRatesMap()

  const enabled = Boolean(fromAsset && toAsset && fromAmount.planck)

  const applicableModules = useMemo(
    () =>
      fromAsset && toAsset
        ? swapModules.filter((m) => toAsset.context[m.protocol] && fromAsset.context[m.protocol])
        : [],
    [fromAsset, toAsset]
  )

  const queryResults = useQueries({
    queries: applicableModules.map((module) => ({
      queryKey: [
        "swap-quote",
        module.protocol,
        fromAsset?.id ?? null,
        toAsset?.id ?? null,
        fromAmount.planck.toString(),
        fromAddress,
        toAddress,
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        module.getQuote(
          {
            fromAsset: fromAsset!,
            toAsset: toAsset!,
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
    const flatQuotes: BaseQuote[] = []
    for (const result of queryResults) {
      if (!result.data) continue
      const data = result.data
      if (Array.isArray(data)) {
        for (const q of data) {
          if (q && q.outputAmountBN > 0n) flatQuotes.push(q)
        }
      } else {
        if (data.outputAmountBN > 0n) flatQuotes.push(data)
      }
    }

    const withFees = flatQuotes.map((quote) => {
      const fees = quote.fees
        .reduce((acc, fee) => {
          const rate = (tokenRates as any)[fee.tokenId]?.usd?.price ?? 0
          return acc.plus(fee.amount.times(rate))
        }, BigNumber(0))
        .toNumber()
      return { quote, fees }
    })

    return [...withFees].sort((a, b) => {
      switch (quoteSorting) {
        case "bestRate":
          return +(b.quote.outputAmountBN - a.quote.outputAmountBN).toString()
        case "fastest":
          return a.quote.timeInSec - b.quote.timeInSec
        case "cheapest":
          return a.fees - b.fees
        case "decentalised":
          return b.quote.decentralisationScore - a.quote.decentralisationScore
        default:
          return 0
      }
    })
  }, [quotesDataKey, tokenRates, quoteSorting])

  // Selected quote
  const selectedQuote: BaseQuote | null = useMemo(() => {
    if (sortedQuotes.length === 0) return null

    const match = sortedQuotes.find(
      ({ quote }) =>
        quote.protocol === selectedProtocol &&
        (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true)
    )

    return (match ?? sortedQuotes[0])?.quote ?? null
  }, [sortedQuotes, selectedProtocol, selectedSubProtocol])

  const selectedQuoteFees: number | undefined = useMemo(() => {
    if (!selectedQuote) return undefined
    return sortedQuotes.find(({ quote }) => quote === selectedQuote)?.fees
  }, [sortedQuotes, selectedQuote])

  // Selected module
  const selectedModule: SwapModule | undefined = useMemo(() => {
    if (!selectedQuote) return undefined
    return swapModules.find((m) => m.protocol === selectedQuote.protocol)
  }, [selectedQuote])

  // Output amount (use primitive deps to avoid recreating Decimal on every render)
  const outputAmountBN = selectedQuote?.outputAmountBN
  const toDecimals = toAsset?.decimals
  const toSymbol = toAsset?.symbol
  const toAmount: Decimal | null = useMemo(() => {
    if (outputAmountBN === undefined || outputAmountBN === null || !toDecimals || !toSymbol)
      return null
    return Decimal.fromPlanck(outputAmountBN, toDecimals, { currency: toSymbol })
  }, [outputAmountBN, toDecimals, toSymbol])

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
