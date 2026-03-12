import type { TokenRatesList } from "@talismn/token-rates"
import BigNumber from "bignumber.js"

import type { BaseQuote, SupportedSwapProtocol } from "../swap-modules/common.swap-module"

export type QuoteSorting = "decentalised" | "cheapest" | "fastest" | "bestRate"

export type QuoteWithFees = { quote: BaseQuote; fees: number }

/**
 * Flatten query results into a list of valid quotes (outputAmountBN > 0).
 */
export const flattenQuotes = (
  results: Array<BaseQuote | BaseQuote[] | null | undefined>
): BaseQuote[] => {
  const flat: BaseQuote[] = []
  for (const data of results) {
    if (!data) continue
    if (Array.isArray(data)) {
      for (const q of data) {
        if (q && q.outputAmountBN > 0n) flat.push(q)
      }
    } else {
      if (data.outputAmountBN > 0n) flat.push(data)
    }
  }
  return flat
}

/**
 * Calculate total fees in USD for a single quote.
 */
export const calculateQuoteFees = (quote: BaseQuote, tokenRates: TokenRatesList): number =>
  quote.fees
    .reduce((acc, fee) => {
      const rate = tokenRates[fee.tokenId]?.usd?.price ?? 0
      return acc.plus(fee.amount.times(rate))
    }, BigNumber(0))
    .toNumber()

/**
 * Attach USD fee totals to each quote.
 */
export const attachFees = (quotes: BaseQuote[], tokenRates: TokenRatesList): QuoteWithFees[] =>
  quotes.map((quote) => ({ quote, fees: calculateQuoteFees(quote, tokenRates) }))

/**
 * Sort quotes according to the chosen sorting strategy.
 */
export const sortQuotes = (quotes: QuoteWithFees[], sorting: QuoteSorting): QuoteWithFees[] =>
  [...quotes].sort((a, b) => {
    switch (sorting) {
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

/**
 * Select the best quote: prefer the user's chosen protocol, fall back to the top-sorted quote.
 */
export const selectQuote = (
  sortedQuotes: QuoteWithFees[],
  selectedProtocol: SupportedSwapProtocol | null,
  selectedSubProtocol: string | undefined
): BaseQuote | null => {
  if (sortedQuotes.length === 0) return null

  const match = sortedQuotes.find(
    ({ quote }) =>
      quote.protocol === selectedProtocol &&
      (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true)
  )

  return (match ?? sortedQuotes[0])?.quote ?? null
}
