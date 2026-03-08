// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import { useTokenRatesMap } from "@ui/state/tokenRates"
import BigNumber from "bignumber.js"
import { useEffect, useMemo, useState } from "react"

import type {
  BaseQuote,
  QuoteParams,
  SupportedSwapProtocol,
  SwappableAssetWithDecimals,
} from "../swap-modules/common.swap-module"
import { swapModules } from "../swaps.api"
import { Decimal } from "../swaps-port/Decimal"
import type { Loadable } from "../types"

/**
 * Fetches quotes from all applicable swap modules, sorts them, and derives
 * the selected quote, module, and output amount.
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
  quoteRefresher: number
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

  // Track per-module quotes as individual Loadable entries
  const [moduleQuotes, setModuleQuotes] = useState<
    Map<string, Loadable<BaseQuote | BaseQuote[] | null>>
  >(new Map())
  const [_allSettled, setAllSettled] = useState(false)

  // Fetch quotes from each module
  // biome-ignore lint/correctness/useExhaustiveDependencies: quoteRefresher forces re-fetch
  useEffect(() => {
    if (!fromAsset || !toAsset || !fromAmount.planck) {
      setModuleQuotes(new Map())
      setAllSettled(true)
      return
    }

    const controller = new AbortController()
    setAllSettled(false)

    const applicableModules = swapModules.filter(
      (m) => toAsset.context[m.protocol] && fromAsset.context[m.protocol]
    )

    // Initialize all as loading
    const initial = new Map<string, Loadable<BaseQuote | BaseQuote[] | null>>()
    for (const m of applicableModules) {
      initial.set(m.protocol, { state: "loading" })
    }
    setModuleQuotes(new Map(initial))

    let settledCount = 0
    const totalModules = applicableModules.length

    for (const module of applicableModules) {
      const quoteParams: QuoteParams = {
        fromAsset,
        toAsset,
        fromAmount,
        fromAddress,
        toAddress,
        selectedSubProtocol,
      }

      module
        .getQuote(quoteParams, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          setModuleQuotes((prev) => {
            const next = new Map(prev)
            next.set(module.protocol, { state: "hasData", data: result })
            return next
          })
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          setModuleQuotes((prev) => {
            const next = new Map(prev)
            next.set(module.protocol, { state: "hasError", error })
            return next
          })
        })
        .finally(() => {
          settledCount++
          if (settledCount >= totalModules) setAllSettled(true)
        })
    }

    if (totalModules === 0) setAllSettled(true)

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fromAsset,
    toAsset,
    fromAmount.planck,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    fromAmount,
    params.quoteRefresher,
  ])

  // Flatten per-module results into a single quote array
  const quotesLoadable: Loadable<Loadable<BaseQuote | null>[] | null> = useMemo(() => {
    if (!fromAsset || !toAsset || !fromAmount.planck) {
      return { state: "hasData", data: null }
    }

    const entries = Array.from(moduleQuotes.values())
    if (entries.length === 0) return { state: "loading" }

    const flatQuotes: Loadable<BaseQuote | null>[] = []
    for (const entry of entries) {
      if (entry.state === "loading") {
        flatQuotes.push({ state: "loading" })
      } else if (entry.state === "hasError") {
        flatQuotes.push({ state: "hasError", error: entry.error })
      } else if (entry.state === "hasData") {
        const data = entry.data
        if (data === null) continue
        if (Array.isArray(data)) {
          for (const q of data) {
            if (q && q.outputAmountBN > 0n) {
              flatQuotes.push({ state: "hasData", data: q })
            }
          }
        } else {
          if (data.outputAmountBN > 0n) {
            flatQuotes.push({ state: "hasData", data })
          }
        }
      }
    }

    return { state: "hasData", data: flatQuotes.length > 0 ? flatQuotes : null }
  }, [moduleQuotes, fromAsset, toAsset, fromAmount.planck])

  // Sort quotes and attach fiat fee calculations
  const sortedQuotesLoadable: Loadable<
    { quote: Loadable<BaseQuote | null>; fees?: number }[] | undefined
  > = useMemo(() => {
    if (quotesLoadable.state !== "hasData") {
      if (quotesLoadable.state === "loading") return { state: "loading" } as const
      return { state: "hasError", error: (quotesLoadable as any).error } as Loadable<
        { quote: Loadable<BaseQuote | null>; fees?: number }[] | undefined
      >
    }
    if (!quotesLoadable.data) return { state: "hasData", data: undefined }

    const withFees = quotesLoadable.data.map((q) => {
      if (q.state !== "hasData" || !q.data) return { quote: q, fees: 0 }
      const fees = q.data.fees
        .reduce((acc, fee) => {
          const rate = (tokenRates as any)[fee.tokenId]?.usd?.price ?? 0
          return acc.plus(fee.amount.times(rate))
        }, BigNumber(0))
        .toNumber()
      return { quote: q, fees }
    })

    const sorted = [...withFees].sort((a, b) => {
      if (a.quote.state !== "hasData" || !a.quote.data) return 1
      if (b.quote.state !== "hasData" || !b.quote.data) return -1
      switch (quoteSorting) {
        case "bestRate":
          return +(b.quote.data.outputAmountBN - a.quote.data.outputAmountBN).toString()
        case "fastest":
          return a.quote.data.timeInSec - b.quote.data.timeInSec
        case "cheapest":
          return (a.fees ?? 0) - (b.fees ?? 0)
        case "decentalised":
          return b.quote.data.decentralisationScore - a.quote.data.decentralisationScore
        default:
          return 0
      }
    })

    return { state: "hasData", data: sorted }
  }, [quotesLoadable, tokenRates, quoteSorting])

  // Resolve the selected quote from the sorted list
  const selectedQuoteLoadable: Loadable<{
    quote: Loadable<BaseQuote | null>
    fees?: number
  } | null> = useMemo(() => {
    if (sortedQuotesLoadable.state !== "hasData") return sortedQuotesLoadable as any
    const quotes = sortedQuotesLoadable.data
    if (!quotes) return { state: "hasData", data: null }

    const quote =
      quotes.find(
        (q) =>
          q.quote.state === "hasData" &&
          q.quote.data &&
          q.quote.data.protocol === selectedProtocol &&
          (q.quote.data.subProtocol ? q.quote.data.subProtocol === selectedSubProtocol : true)
      ) ?? quotes[0]

    return { state: "hasData", data: quote ?? null }
  }, [sortedQuotesLoadable, selectedProtocol, selectedSubProtocol])

  // Resolve the swap module for the selected quote
  const selectedModuleLoadable: Loadable<(typeof swapModules)[number] | undefined> = useMemo(() => {
    if (selectedQuoteLoadable.state !== "hasData") return selectedQuoteLoadable as any
    const selected = selectedQuoteLoadable.data
    if (!selected) return { state: "hasData", data: undefined }

    const protocol = selected.quote.state === "hasData" ? selected.quote.data?.protocol : undefined
    if (!protocol) return { state: "hasData", data: undefined }

    return { state: "hasData", data: swapModules.find((m) => m.protocol === protocol) }
  }, [selectedQuoteLoadable])

  // Derive output amount from the selected quote
  const toAmountLoadable: Loadable<Decimal | null> = useMemo(() => {
    if (selectedQuoteLoadable.state !== "hasData") return selectedQuoteLoadable as any
    const selected = selectedQuoteLoadable.data
    if (
      !selected ||
      selected.quote.state !== "hasData" ||
      selected.quote.data?.outputAmountBN === undefined ||
      !toAsset
    )
      return { state: "hasData", data: null }

    return {
      state: "hasData",
      data: Decimal.fromPlanck(selected.quote.data.outputAmountBN, toAsset.decimals, {
        currency: toAsset.symbol,
      }),
    }
  }, [selectedQuoteLoadable, toAsset])

  return {
    quotesLoadable,
    sortedQuotesLoadable,
    selectedQuoteLoadable,
    selectedModuleLoadable,
    toAmountLoadable,
  }
}
